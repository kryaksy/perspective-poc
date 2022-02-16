import { worker } from "https://unpkg.com/@finos/perspective/dist/cdn/perspective.js";
import { getData } from "./data.js";

const WORKER = worker();

const SCHEMA = {
    index: "string",
    string: "string",
    float: "float",
};

let MATCH_QUERY = 'B'
let VIEW_CONFIG = {
    group_by: ["string"],
    split_by: [],
    columns: ["float", "exp"],
    filter: [],
    sort: [],
    expressions: [`// exp \n if (match("string", '${MATCH_QUERY}')) {"float" * -1} else {"float"}`],
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
    await loadViewToJsonData(view);
}

let ERROR_INDEXES = [];
function validateData() {
    ERROR_INDEXES = [];
    const rowEls = [...document.querySelectorAll('perspective-viewer tbody tr')];
    const rows = rowEls
        .map(row => {
            const cells = [...row.querySelectorAll('th'), ...row.querySelectorAll('td')];
            return cells.map(cell => cell.innerText).filter(cell => cell !== '')
        })
        .filter(([string]) => string !== 'TOTAL');
    rows.forEach(([string, floatStr, expStr], index) => {
        const float = Number(floatStr);
        const exp = Number(expStr);
        if (string.includes(MATCH_QUERY) ? float !== -1 * exp : float !== exp) {
            ERROR_INDEXES.push(index + 1)
        }
    });
}

const to_json_el = document.querySelector(".data.to_json");
async function loadViewToJsonData(view) {
    const to_json = await view.to_json();
    to_json_el.innerHTML = JSON.stringify({ to_json }, null, 4);
}

window.addEventListener("DOMContentLoaded", load);

async function updateRows(count) {
    const data = getSchemaUpdateData(count)
    if (data.length) {
        await TABLE?.update(data)
            .then(async () => loadView())
            .catch(error => console.error('UPDATE', { error }));
    } else console.log('Update empty');
};

async function insertRows(count) {
    const data = getSchemaInsertData(count);
    if (data.length) {
        await TABLE?.update(data)
            .then(async () => loadView())
            .catch(error => console.error('INSERT', { error }));
    } else console.log('Insert empty');
};

async function removeRows(count) {
    const data = getSchemaDeleteData(count);
    if (data.length) {
        TABLE?.remove(data)
            .then(async () => loadView())
            .catch(error => console.error('DELETE', { error }));
    } else console.log('Delete empty');
};

const periodInput = document.querySelector("#period");
periodInput.value = 500;
let PERIOD = periodInput.value
periodInput.addEventListener('change', (e) => {
    PERIOD = e.target.value
})

let interval;

function stopPeriodic() {
    clearInterval(interval)
}

const updatePeriodicButton = document.querySelector("#update-periodic");
const updateCheckbox = document.querySelector(".update.checkbox");
const insertCheckbox = document.querySelector(".insert.checkbox");
const deleteCheckbox = document.querySelector(".delete.checkbox");
const errorEl = document.querySelector("#error");
function startPeriodic() {
    stopPeriodic();
    interval = setInterval(async () => {
        validateData()
        if (ERROR_INDEXES.length) {
            stopPeriodic();
            errorEl.innerHTML = `exp column in ${ERROR_INDEXES.join(',')} and the expression do not match.`
            ERROR_INDEXES.forEach(index => {
                const row = document.querySelectorAll('perspective-viewer tbody tr')[index];
                [...row.querySelectorAll('td')].forEach(cell => cell.style.background = 'darkred')
            })
        } else {
            document.querySelectorAll('perspective-viewer tbody tr')?.forEach(item => item.style.background = 'transparent')
            if (updateCheckbox.checked) await updateRows(1)
            if (insertCheckbox.checked) await insertRows(2)
            if (deleteCheckbox.checked) await removeRows(1)
        }
    }, PERIOD)
}

startPeriodic()

updatePeriodicButton.addEventListener('click', (e) => {
    ERROR_INDEXES = [];
    errorEl.innerHTML = ''
    startPeriodic()
})

const stopPeriodicButton = document.querySelector("#stop-periodic");
stopPeriodicButton.addEventListener('click', (e) => {
    stopPeriodic()
})
