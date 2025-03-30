import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser } from "@whiskeysockets/baileys";
import cfonts from "cfonts";
import pino from "pino";
import { Boom } from "@hapi/boom";
import chalk from "chalk";
import { promises as fs } from "node:fs";
import path from "node:path";
import qrcodeTerminal from "qrcode-terminal";
import Plugin from "./lib/plugins.mjs";
import serialize from "./lib/serialize.mjs";
import handler from "./handler.mjs";
import { JSONFilePreset } from "lowdb/node";
const sessionFolder = path.join("EvaSessions");

/**
 * Mensajes de inicio.
 */
console.log(chalk.green.bold("Iniciando..."));
cfonts.say("Eva Wa Bot", {
    font: "block",
    align: "center",
    gradient: ["blue", "green"]
});
cfonts.say("desarrollado por danixljs", {
    font: "console",
    align: "center",
    color: "cyan"
});

/**
 * Iniciamos la base de datos.
 */
globalThis.db = await JSONFilePreset("database.json", {
    users: {},
    groups: {},
    settings: {},
});
await db.read();
console.log(chalk.green("Base de datos iniciada corréctamente."));

/**
 * Cargamos los plugins.
 */
await Plugin.load();

/**
 * Observamos cualquier cambio en la carpeta de plugins.
 */
new Plugin();

/**
 * Iniciamos el cliente.
 */
await start();

async function start() {
    /**
     * version => Es la versión de WhatsApp que utilizará tu cliente.
     * isLatest => Indica si es la última versión.
     */
    const { version, isLatest } = await fetchLatestBaileysVersion();
    /**
     * state => Son las credenciales de tu cliente.
     * saveCreds => Guarda las credenciales necesarias en la carpeta de sesión.
     */
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
    /**
     * Estas son configuraciones simples, puedes visitar "https://baileys.whiskeysockets.io/types/SocketConfig.html" para saber más.
     */
    const wss = makeWASocket({
        markOnlineOnConnect: true,
        defaultQueryTimeoutMs: undefined,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                pino({
                    level: "silent",
                }).child({
                    level: "silent",
                }),
            ),
        },
        logger: pino({
            level: "silent",
        }),
        browser: ["Ubuntu", "Edge", "131.0.2903.86"],
        connectTimeoutMs: 1000 * 60,
        qrTimeout: 1000 * 60,
        syncFullHistory: false,
        printQRInTerminal: false,
        patchMessageBeforeSending: async (message) => {
            try {
                await wss.uploadPreKeysToServerIfRequired();
            } catch (err) {
                console.warn(err);
            }
            return message;
        },
        generateHighQualityLinkPreview: true,
        version,
    });
    /**
     * Esto es para evitar mensajes molestos de las Pre-Keys en la consola.
     */
    console.info = () => { };
    console.debug = () => { };
    /**
     * Esto es para que se guarden las credenciales.
    */
    wss.ev.on("creds.update", saveCreds);
    /**
     * Aquí manejaremos la conexíon y desconexíon del cliente.
    */
    wss.ev.on("connection.update", async ({ lastDisconnect, qr, connection }) => {
        if (qr) {
            console.log(chalk.green.bold(`
╭───────────────────╼
│ ${chalk.cyan("Escanea este código QR para conectarte.")}
╰───────────────────╼`));
            /**
             * Generamos el QR en la terminal.
             */
            qrcodeTerminal.generate(qr, {
                small: true,
            });
        }
        if (connection === "close") {
            /**
             * Obtenemos el código de estado con el cual se desconectó el bot.
             */
            const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
            /**
             * Usamos switch-case para manejar mejor el error de desconexión.
             */
            switch (code) {
                case DisconnectReason.loggedOut: // 401 - Significa que la sesión se cerró en el dispositivo.
                case DisconnectReason.badSession: // 500 - Significa que la sesión está corructa.
                case DisconnectReason.forbidden: // 403 - Significa que el bot ya no tiene autorización para volver a conectarse.
                case DisconnectReason.multideviceMismatch: // 411 - Significa que hay varias sesiones abiertas y no están bien coordinadas.
                    console.log(chalk.red.bold(`
╭───────────────────╼
│ ${chalk.yellow("La sesión se cerró sin posibilidades de reconexión.")}
╰───────────────────╼`));
                    console.log(JSON.stringify(lastDisconnect, null, 2));
                    /**
                     * Eliminamos la carpeta de sesión.
                     */
                    await fs.rm(sessionFolder, { recursive: true, force: true }).catch(() => void 0);
                    /**
                     * Salimos del proceso con código de estado "1" para indicar que hubo un error grave.
                     */
                    process.exit(1);
                default:
                    console.log(chalk.red.bold(`
╭───────────────────╼
│ ${chalk.yellow(`La sesión se cerró con el código de estado "${chalk.white(code)}", reconéctando.`)}
╰───────────────────╼`));
                    /**
                     * Ejecutamos de nuevo la función para que el bot se vuelva a reconectar.
                     */
                    await start();
                    break;
            }
        }
        if (connection === "open") {
            /**
             * Usamos la función "jidNormalizedUser" para convertir el id del bot "XXXXXXXX:XX@s.whatsapp.net" a "XXXXXXXX@s.whatsapp.net"
             */
            const userJid = jidNormalizedUser(wss.user.id);
            const userName = wss.user.name || wss.user.verifiedName || "Desconocido";
            console.log(chalk.green.bold(`
╭───────────────────╼
│ ${chalk.cyan("Conéctado con éxito")}
│
│- ${chalk.cyan("Usuario :")} +${chalk.white(userJid.split("@")[0] + " - " + userName)}; 
│- ${chalk.cyan("Versión de WhatsApp :")} ${chalk.white(version)} es la última ? ${chalk.white(isLatest)} 
╰───────────────────╼`));
        }
    });
    /**
     * Aquí manejaremos los mensajes entrantes.
     */
    wss.ev.on("messages.upsert", async ({ messages, type }) => {
        /**
         * "notify" para solo procesar mensajes que no sean del propio bot.
         */
        if (type === "notify" && messages && messages.length !== 0) {
            /**
             * Iteramos sobre el array de mensajes
             */
            for (const message of messages) {
                const m = serialize(message, wss);
                /**
                 * - "@newsletter" => Ignora mensajes recibidos de canales.
                 * - "@lib" => Ignora mensajes de usuarios cuyo Jid termina en "@lid" y no en "@s.whatsapp.net"
                 * - "status@broadcast" => Ignora mensajes de los estados de tus contactos.
                 */
                if (m && !/(@newsletter$|@lib$)|^status@broadcast$/.test(m.sender)) {
                    console.log(chalk.green.bold(`
╭─────────< Eva Wa Bot - Vs 1.0.1 >──────────╼
│ ${chalk.cyan(`Mensaje recibido`)}
│
│- ${chalk.cyan("Chat :")} ${chalk.white(m.chat)}
│- ${chalk.cyan("Usuario :")} +${chalk.white(m.sender.split("@")[0] + " - " + m.pushName)}
│- ${chalk.cyan("Tipo :")} ${chalk.white(m.type)};
╰╼
${chalk.whiteBright(m.text)}`));
                    handler(wss, m);
                }

            }
        }
    });
    /**
     * Puedes manejar más eventos siguiendo el mismo formato: wss.ev.on("event-type", () => {});
     */
}