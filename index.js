import { worker } from "https://unpkg.com/@finos/perspective/dist/cdn/perspective.js";
import { getData } from "./data.js";

const WORKER = worker();

const SCHEMA = {
    index: "string",
    datetime: "datetime",
    string: "string",
    integer: "integer",
    float: "float",
    boolean: "boolean"
};

let VIEW_CONFIG = {
    group_by: [],
    split_by: [],
    columns: ["index", "datetime", "string", "integer", "float", "boolean"],
    filter: [],
    sort: [],
    expressions: [],
    aggregates: {
        datetime: "any"
    },
};

const LAYOUT = {
    settings: true,
    ...VIEW_CONFIG,
};

const DATA = getData(SCHEMA, 10);
let TABLE;

async function load() {
    await loadTable();
    await loadView();
    await loadViewer();
}

async function loadTable() {
    TABLE = await WORKER.table(SCHEMA, { index: "index" });
    await TABLE.update(DATA);
}

async function loadViewer() {
    const el = document.querySelector("perspective-viewer");
    el.load(TABLE);
    el.restore(LAYOUT);
    el.toggleConfig();
    el.addEventListener("perspective-config-update", () =>
        onConfigUpdate(el, TABLE)
    );
}

async function onConfigUpdate(el) {
    const NEW_LAYOUT = await el.save();
    VIEW_CONFIG = Object.entries(VIEW_CONFIG).reduce(
        (acc, [key]) => {
            return Object.assign(acc, { [key]: NEW_LAYOUT[key] });
        },
        {}
    );
    await loadView();
}

async function loadView() {
    const view = await TABLE.view(VIEW_CONFIG);
    await loadViewConfig(view);
    await loadViewToJsonData(view);
    await loadViewToColumnsData(view);
}

async function loadViewToJsonData(view) {
    const to_json = await view.to_json();
    const el = document.querySelector(".data.to_json");
    el.innerHTML = JSON.stringify({ to_json }, null, 4);
}

async function loadViewToColumnsData(view) {
    const to_columns = await view.to_columns();
    const el = document.querySelector(".data.to_columns");
    el.innerHTML = JSON.stringify({ to_columns }, null, 4);
}

async function loadViewConfig(view) {
    const get_config = await view.get_config();
    const el = document.querySelector(".config.json");
    el.innerHTML = JSON.stringify({ get_config }, null, 4);
}

window.addEventListener("DOMContentLoaded", load);

