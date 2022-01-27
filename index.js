import { worker } from "https://unpkg.com/@finos/perspective/dist/cdn/perspective.js";
import { getData } from "./data.js";

const WORKER = worker();

const SCHEMA = {
    index: "string",
    string: "string",
    float: "float",
};

let VIEW_CONFIG = {
    row_pivots: [],
    column_pivots: [],
    columns: ["string", "float", "exp"],
    filter: [],
    sort: [],
    expressions: [`// exp \n if (match("string", 'b')) {"float" * -1} else {"float"}`],
    aggregates: {},
};

const LAYOUT = {
    settings: true,
    ...VIEW_CONFIG,
};

const DATA = getData(SCHEMA, 20);
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

const utcDateTimeEl = document.querySelector("#utc-time");
const utcDateTimeValueEl = document.querySelector("#utc-time-value");

utcDateTimeEl.addEventListener('change', async e => {
    utcDateTimeValueEl.innerHTML = `TS: ${e.target.valueAsNumber}`;
    await TABLE.update(DATA.map(item => ({
        ...item,
        date: e.target.valueAsNumber
    })));
    await loadView()
})