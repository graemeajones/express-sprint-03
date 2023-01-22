import { buildSetFields } from './model-utils.js';

const table = 'Users';
const mutableFields = ['UserFirstname', 'UserLastname', 'UserEmail', 'UserLevel', 'UserYearID', 'UserUsertypeID', 'UserImageURL'];
const idField = 'UserID';
const fields = [idField, ...mutableFields];

export const buildCreateQuery = (record) => {
  const sql = `INSERT INTO ${table} ` + buildSetFields(mutableFields);
  return { sql, data: record };
};

export const buildReadQuery = (id, variant) => {
  const resolvedTable = `((${table} LEFT JOIN Usertypes ON UserUsertypeID=UsertypeID) LEFT JOIN Years ON UserYearID=YearID )`;
  const resolvedFields = [...fields, 'UsertypeName AS UserUsertypeName', 'YearName AS UserYearName'];

  let sql = '';
  const STAFF = 1; // Primary key for staff type in Unibase Usertypes table
  const STUDENT = 2; // Primary key for student type in Unibase Usertypes table

  switch (variant) {
    case 'student':
      sql = `SELECT ${resolvedFields} FROM ${resolvedTable} WHERE UserUsertypeID=${STUDENT}`;
      break;
    case 'staff':
      sql = `SELECT ${resolvedFields} FROM ${resolvedTable} WHERE UserUsertypeID=${STAFF}`;
      break;
    case 'groups':
      extendedTable = `Groupmembers INNER JOIN ${resolvedTable} ON Groupmembers.GroupmemberUserID=Users.UserID`;
      sql = `SELECT ${resolvedFields} FROM ${extendedTable} WHERE GroupmemberGroupID=:ID`;
      break;
    default:
      sql = `SELECT ${resolvedFields} FROM ${resolvedTable}`;
      if (id) sql += ` WHERE UserID=:ID`;
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
