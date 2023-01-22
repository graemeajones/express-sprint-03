import { buildSetFields } from './model-utils.js';

const table = 'Modules';
const mutableFields = ['ModuleName', 'ModuleCode', 'ModuleLevel', 'ModuleYearID', 'ModuleLeaderID', 'ModuleImageURL'];
const idField = 'ModuleID';
const fields = [idField, ...mutableFields];

export const buildCreateQuery = (record) => {
  const sql = `INSERT INTO ${table} ` + buildSetFields(mutableFields);
  return { sql, data: record };
};

export const buildReadQuery = (id, variant) => {
  const resolvedTable = `((${table} LEFT JOIN Users ON ModuleLeaderID=UserID) LEFT JOIN Years ON ModuleYearID=YearID )`;
  const resolvedFields = [...fields, 'CONCAT(UserFirstname," ",UserLastname) AS ModuleLeaderName', 'YearName AS ModuleYearName'];

  let sql = '';
  switch (variant) {
    case 'leader':
      sql = `SELECT ${resolvedFields} FROM ${resolvedTable} WHERE ModuleLeaderID=:ID`;
      break;
    case 'users':
      extendedTable = `Modulemembers INNER JOIN ${resolvedTable} ON Modulemembers.ModulememberModuleID=Modules.ModuleID`;
      sql = `SELECT ${resolvedFields} FROM ${extendedTable} WHERE ModulememberUserID=:ID`;
      break;
    default:
      sql = `SELECT ${resolvedFields} FROM ${resolvedTable}`;
      if (id) sql += ` WHERE ModuleID=:ID`;
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
