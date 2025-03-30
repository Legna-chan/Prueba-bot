/**
 * Este es un ejemplo de como se veria un plugin.
 * 
 * - Recordemos que la estructura de nuestro plugin es:
 * commands => Array<string>, osea: ["comando1", "comando2", ...]
 * description => string, osea: "Descripción del comando"
 * category => string, osea: "categoria"
 * flags => Array<string>, osea: ["bandera1", "bandera2", ...]
 * exec => Promise<void>, osea: async (wss, { m, ...}) {}
 */
export default {
    commands: ["say"],
    description: "Repite todo el texto.",
    category: "fun",
    flags: [], //vacio porque no require banderas.
    exec: async (wss, { m, text }) => {
        if (!text) {
            await wss.sendMessage(m.chat, { text: "- Ingresa un texto para continuar.", mentions: [m.sender] }, { quoted: m });
            return;
        }
        await wss.sendMessage(m.chat, { text, mentions: [m.sender] }, { quoted: m });
    }
}