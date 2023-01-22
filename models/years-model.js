import { buildSetFields } from './model-utils.js';

const table = 'Years';
const mutableFields = ['YearName'];
const idField = 'YearID';
const fields = [idField, ...mutableFields];

export const buildCreateQuery = (record) => {
  const sql = `INSERT INTO ${table} ` + buildSetFields(mutableFields);
  return { sql, data: record }; 
};

export const buildReadQuery = (id, variant) => {

  let sql = '';
  switch (variant) {
    default:
      sql = `SELECT ${fields} FROM ${table}`;
      if (id) sql += ` WHERE YearID=:ID`;
  }

  return { sql, data: { ID: id } };
};

export const buildUpdateQuery = (record, id) => {
  const sql = `UPDATE ${table} ` + buildSetFields(mutableFields) + ` WHERE ${idField}=:${idField}`;
  return { sql, data: { ...record, [idField]: id } };
};

export const buildDeleteQuery = (id) => {
  const sql = `DELETE FROM ${table} WHERE ${idField}=:${idField}`;
  return { sql, data: { ...record, [idField]: id } };
};
