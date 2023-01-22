import { buildSetFields } from './model-utils.js';

const table = 'Modulemembers';
const mutableFields = ['ModulememberModuleID', 'ModulememberUserID'];
const idField = 'ModulememberID';
const fields = [idField, ...mutableFields];

export const buildCreateQuery = (record) => {
  const sql = `INSERT INTO ${table} ` + buildSetFields(mutableFields);
  return { sql, data: record }; 
};

export const buildReadQuery = (id, variant) => {
  const resolvedTable = `((${table} LEFT JOIN Users ON ModulememberUserID=UserID) LEFT JOIN Modules ON ModulememberModuleID=ModuleID )`;
  const resolvedFields = [...fields, 'CONCAT(ModuleCode," ",ModuleName) AS ModulememberModuleName', 'CONCAT(UserFirstname," ",UserLastname) AS ModulememberUserName' ];

  let sql = '';
  switch (variant) {
    default:
      sql = `SELECT ${resolvedFields} FROM ${resolvedTable}`;
      if (id) sql += ` WHERE ModulememberID=:ID`;
  }

  return { sql, data: { ID: id } };
};

export const buildUpdateQuery = (record, id) => {
  const sql = `UPDATE ${table} ` + buildSetFields(mutableFields) + ` WHERE ${idField}=:${idField}`;
  return { sql, data: { ...record, [idField]: id } };
};

export const buildDeleteQuery = (id) => {
  const sql = `DELETE FROM ${table} WHERE ${idField}=:${idField}`;
  return { sql, data: { [idField]: id } };
};

