
import { getRandomDate, getRandomFloat, getRandomString, getRandomInteger } from "./random.js";

const RANDOM_STRING_CHAR_COUNT = 5;

const RANDOM_DATE_START_DATE = new Date(2000);
const RANDOM_DATE_END_DATE = new Date();

const RANDOM_INTEGER_MIN = 0;
const RANDOM_INTEGER_MAX = 1000000;

const RANDOM_FLOAT_MIN = 0;
const RANDOM_FLOAT_MAX = 1;

function getValue(type) {
    switch (type) {
        case 'integer':
            return getRandomInteger(RANDOM_INTEGER_MIN, RANDOM_INTEGER_MAX)
        case 'float':
            return getRandomFloat(RANDOM_FLOAT_MIN, RANDOM_FLOAT_MAX)
        case 'string':
            return getRandomString(RANDOM_STRING_CHAR_COUNT)
        case 'datetime':
            return getRandomDate(RANDOM_DATE_START_DATE, RANDOM_DATE_END_DATE);
        case 'boolean':
            return Math.random() > 0.4999;
    }
}

function getRow(SCHEMA) {
    return Object.entries(SCHEMA).reduce((acc, [field, type]) => {
        return Object.assign(acc, { [field]: getValue(type) })
    }, {})
}

export function getData(SCHEMA, COUNT = 10) {
    return new Array(COUNT).fill(null).reduce((acc) => {
        return acc.concat([getRow(SCHEMA)]);
    }, []);
}