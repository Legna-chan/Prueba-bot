import chalk from "chalk";
import Plugin from "./lib/plugins.mjs";
import serialize from "./lib/serialize.mjs";

/**
 * Aqui manejaremos los comandos y plugins.
 * @param {import("@whiskeysockets/baileys").WASocket} wss 
 * @param {ReturnType<serialize>} m 
 */
export default async function handler(wss, m) {
    try {
        /**
         * Verificamos que la base de datos esté cargada.
         */
        if (db?.data) {
            /**
             * Verificamos si el usuario está registrado en la base de datos, si no está, lo registramos.
             */
            if (typeof db.data.users[m.sender] !== "object") {
                db.data.users[m.sender] = {
                    name: m.pushName,
                    userJid: m.sender,
                    level: 0,
                    exp: 0,
                    rank: "Nuv",
                    lastActivity: 0,
                }
            } else {
                if (m.pushName && db.data.users[m.sender].name !== m.pushName) {
                    db.data.users[m.sender].name = m.pushName;
                }
                db.data.users[m.sender].exp += 10;
                db.data.users[m.sender].lastActivity = Date.now();
            }
            /**
             * Lo mismo con el grupo.
             */
            if (m.isGroup && typeof db.data.groups[m.chat] !== "object") {
                db.data.groups[m.chat] = {
                    antilink: false,
                    alerts: true,
                    welcome: true,
                }
            }
            /**
             * Y los aquí también;
             */
            if (!db.data.settings) {
                db.data.settings = {
                    grouponly: false,
                    privateonly: false,
                    commandsExecuted: 0,
                }
            } else {
                db.data.settings.commandsExecuted++;
            }
            await db.write();
        }
        /**
         * Verificamos si el mensaje tiene un texto, si no tiene retornamos.
         */
        if (!m.text) return;
        /**
         * Separamos el mensaje en pedazos, ej: "/play Wanna Be Yours" => ["/play", "Wanna", "Be", "Yours"]
         */
        const body = m.text.trim().split(" ");
        /**
         * Quitamos el primer item (que seria el comando ejecutado), ej: ["/play", "Wanna", "Be", "Yours"] => "Wanna Be Yours"
         */
        const text = body.slice(1).join(" ");
        /**
         * Quitamos el primer item y dejamos los demás cómo argumentos, ej: ["/play", "Wanna", "Be", "Yours"] => ["Wanna", "Be", "Yours"]
         */
        const args = body.slice(1);
        /**
         * Extraemos el primer carácter del primer item (que seria el prefijo utilizado), ej: ["/play", ...] => "/"
         */
        const usedPrefix = body[0].charAt(0);
        /**
         * Quitamos el primer carácter (el prefijo usado) del primer item y dejamos el resto, ej: ["/play", ...] => "play"
         */
        const command = body[0].slice(1);
        /**
         * Obtenemos el plugin que tenga el comando ingresado.
         */
        const plugin = Plugin.get(command);
        /**
         * Verificamos que el prefijo utilizado sea el que queremos y el plugin no sea "null" o "undefined"
         */
        // Prefijos aceptados: . $ + &
        // Agrega más según tus necesidades.
        if (/^[.$+&]$/.test(usedPrefix) && plugin) {
            if (db.data.settings.grouponly && !m.isGroup) {
                return;
            }
            if (db.data.settings.privateonly && m.isGroup) {
                return;
            }

            /**
             * Aqui puedes manejar las banderas que consideres necesarias para tu bot.
             * Aqui 2 ejemplos:
             */
            if (plugin.flags.includes("isGroup") && !m.isGroup) {
                await wss.sendMessage(m.chat, { text: `- El comando *${usedPrefix + command}* solo puede ser ejecutado en grupos.`, mentions: [m.sender] }, { quoted: m });
                return;
            }
            if (plugin.flags.includes("isPrivate") && m.isGroup) {
                await wss.sendMessage(m.chat, { text: `- El comando *${usedPrefix + command}* solo puede ser ejecutado en el chat privado.`, mentions: [m.sender] }, { quoted: m });
                return;
            }
            /**
             * Aqui procesamos el plugin, usaremos try-catch para capturar cualquier error que ocurra a la hora de procesar el plugin.
             */
            try {
                /**
                 * Aquí en el objeto puedes pasar todos los valores que quieras asi para poder usarlos dentro de tus comandos.
                 */
                await plugin.exec(wss, { m, text, args, command, usedPrefix, plugin, plugins: Plugin.plugins }); // agrega más valores dentro del { } según tus necesidades.
            } catch (error) {
                /**
                 * IMPORTANTE: Si vas a enviar un error al usuario, asegurate de usar "String()" para convertir el error a un string que Baileys pueda enviar, si no usas esto Baileys lanzará un error y el mensaje no se enviará.
                 */
                await wss.sendMessage(m.chat, { text: String(error), mentions: [m.sender] }, { quoted: m });
                return;
            }
        }
    } catch (error) {
        console.error(chalk.red(error));
    }
}