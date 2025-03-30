import { promises as fs, watch } from "node:fs";
import chalk from "chalk";
import path from "node:path";
import { fileURLToPath } from "node:url";
import serialize from "./serialize.mjs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const folder = path.join(__dirname, "..", "plugins");
export default class Plugin {
    /**
     * Aquí se guardarán los plugins que fueron cargados con éxito.
     * @type {Map<string, {
     * commands: Array<string>;
     * description: string;
     * category: string;
     * flags: Array<string>;
     * exec: (wss: import("@whiskeysockets/baileys").WASocket, { m }: { m: ReturnType<serialize>}) => Promise<void>
     * }>}
     */
    static plugins = new Map();
    /**
     * Load all available plugins.
     */
    static async load() {
        try {
            const files = await fs.readdir(folder);
            for (const file of files) {
                if (/\.m?js$/.test(file)) {
                    try {
                        const plugin = await import(path.join(folder, file));
                        const data = plugin.default;
                        if (!data) {
                            continue;
                        }
                        this.plugins.set(file, data);
                    }
                    catch (err) {
                        console.error(chalk.red(`Error al cargar el plugin "${chalk.white(file)}"\n`), err);
                    }
                }
            }
            console.info(chalk.yellow(`Se cargaron "${chalk.white(this.plugins.size)}" plugins con éxito.`));
        }
        catch (err) {
            console.error(chalk.red("Ocurrió un error al cargar los plugins\n"), err);
        }
    }
    /**
     * Recarga un plugin en específico.
     * @param {string} filename
     */
    static async reload(filename) {
        try {
            const now = Date.now();
            const plugin = await import(path.join(folder, `${filename}?update=${now}`));
            const data = plugin.default;
            if (!data) {
                return;
            }
            this.plugins.set(filename, data);
            console.info(chalk.yellow(`Plugin "${chalk.white(filename)}" recargado con éxito`));
        }
        catch (err) {
            console.error(chalk.red(`Error al recargar el plugin "${chalk.white(filename)}"\n`), err);
        }
    }
    /**
     * Elimina un plugin en específico.
     * @param {string} filename
     */
    static delete(filename) {
        return this.plugins.delete(filename);
    }
    /**
     * Obtiene el plugin cuyos comandos tenga el comando ingresado.
     * @param {string} command
     */
    static get(command) {
        for (const data of this.plugins.values()) {
            if (data.commands.includes(command)) {
                return data;
            }
        }
        return null;
    }
    constructor() {
        this.watch();
    }
    async watch() {
        watch(folder, async (eventType, filename) => {
            if (/\.m?js$/.test(filename)) {
                switch (eventType) {
                    case "rename":
                        try {
                            await fs.access(path.join(folder, filename));
                            console.info(chalk.yellow(`Se detectó un nuevo plugin "${chalk.white(filename)}"`));
                            await Plugin.reload(filename);
                        }
                        catch {
                            console.info(chalk.yellow(`Se detectó un plugin eliminado "${chalk.white(filename)}"`));
                            Plugin.delete(filename);
                        }
                        break;
                    case "change":
                        console.info(chalk.yellow(`Se detectó una modificación en el plugin "${chalk.white(filename)}"`));
                        await Plugin.reload(filename);
                        break;
                }
            }
        });
    }
}