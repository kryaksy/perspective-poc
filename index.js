import { worker } from "https://unpkg.com/@finos/perspective/dist/cdn/perspective.js";
import { getData } from "./data.js";

const WORKER = worker();

const SCHEMA = {
    index: "string",
    name: "string",
    date: "datetime",
};

let VIEW_CONFIG = {
    row_pivots: ["index"],
    column_pivots: [],
    columns: ["name", "date", "hour_of_day"],
    filter: [],
    sort: [],
    expressions: ['// hour_of_day \n hour_of_day("date")'],
    aggregates: {
        name: "any",
        date: "any",
        hour_of_day: "any",
    },
};

const LAYOUT = {
    settings: true,
    ...VIEW_CONFIG,
};

const DATA = getData(SCHEMA, 20);

async function load() {
    const table = await loadTable();
    await loadView(table);
    await loadViewer(table);
}

async function loadTable() {
    const table = await WORKER.table(SCHEMA, { index: "index" });
    await table.update(DATA);
    return table;
}

async function loadViewer(table) {
    const el = document.querySelector("perspective-viewer");
    el.load(table);
    el.restore(LAYOUT);
    el.toggleConfig();
    el.addEventListener("perspective-config-update", () =>
        onConfigUpdate(el, table)
    );
}

async function onConfigUpdate(el, table) {
    const NEW_LAYOUT = await el.save();
    VIEW_CONFIG = Object.entries(VIEW_CONFIG).reduce(
        (acc, [key, value]) => {
            return Object.assign(acc, { [key]: NEW_LAYOUT[key] });
        },
        {}
    );
    await loadView(table);
}

async function loadView(table) {
    const view = await table.view(VIEW_CONFIG);
    await loadViewConfig(view);
    await loadViewJsonData(view);
}

async function loadViewJsonData(view) {
    const data = await view.to_json();
    const el = document.querySelector(".data.json");
    el.innerHTML = JSON.stringify(data, null, 4);
}

async function loadViewConfig(view) {
    const config = await view.get_config();
    const el = document.querySelector(".config.json");
    el.innerHTML = JSON.stringify(config, null, 4);
}

window.addEventListener("DOMContentLoaded", load);