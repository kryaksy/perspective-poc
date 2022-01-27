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
    expressions: [`// exp \n if (match("string", 'B')) {"float" * -1} else {"float"}`],
    aggregates: {},
};

const LAYOUT = {
    settings: true,
    ...VIEW_CONFIG,
};

let indexes = [];

function getSchemaData(count) {
    const data = getData(SCHEMA, count);
    data.forEach(item => indexes.push(item.index));
    return data;
}

function getSchemaUpdateData(count) {
    const data = getData(SCHEMA, count)
    return data.filter(item => indexes.includes(item.index));
}

function getSchemaInsertData(count) {
    const data = getData(SCHEMA, count)
    const result = data.filter(item => !indexes.includes(item.index));
    result.forEach(item => indexes.push(item.index));
    return result;
}

function getSchemaDeleteData(count) {
    const result = indexes.slice(0, count);
    indexes.splice(0, count);
    return result;
}

const DATA = getSchemaData(20);
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

async function updateRows(count) {
    const data = getSchemaUpdateData(count)
    if (data.length) {
        await TABLE.update(data)
            .then(async () => loadView())
            .catch(error => console.error('UPDATE', { error }));
    } else console.log('Update empty');
};

async function insertRows(count) {
    const data = getSchemaInsertData(count);
    if (data.length) {
        await TABLE.update(data)
            .then(async () => loadView())
            .catch(error => console.error('INSERT', { error }));
    } else console.log('Insert empty');
};

async function removeRows(count) {
    const data = getSchemaDeleteData(count);
    if (data.length) {
        TABLE.remove(data)
            .then(async () => loadView())
            .catch(error => console.error('DELETE', { error }));
    } else console.log('Delete empty');
};

const updateButton = document.querySelector("#update");
updateButton.addEventListener('click', async e => {
    await updateRows(5);
})

const insertButton = document.querySelector("#insert");
insertButton.addEventListener('click', async e => {
    await insertRows(5);
})

const deleteButton = document.querySelector("#delete");
deleteButton.addEventListener('click', async e => {
    await removeRows(1);
})

const periodInput = document.querySelector("#period");
periodInput.value = 1000;
let PERIOD = periodInput.value
periodInput.addEventListener('change', (e) => {
    PERIOD = e.target.value
})

const updatePeriodicButton = document.querySelector("#update-periodic");
let interval;
const updateCheckbox = document.querySelector(".update.checkbox");
const insertCheckbox = document.querySelector(".insert.checkbox");
const deleteCheckbox = document.querySelector(".delete.checkbox");
updatePeriodicButton.addEventListener('click', (e) => {
    clearInterval(interval)
    interval = setInterval(async () => {
        if (updateCheckbox.checked) await updateRows(1)
        if (insertCheckbox.checked) await insertRows(1)
        if (deleteCheckbox.checked) await removeRows(1)
    }, PERIOD)
})

const stopPeriodicButton = document.querySelector("#stop-periodic");
stopPeriodicButton.addEventListener('click', (e) => {
    clearInterval(interval)
})
