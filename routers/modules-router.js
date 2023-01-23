import { Router } from 'express';
import database from '../database.js';

const router = new Router();

// Query builders --------------------------------

const buildSetFields = (fields) => fields.reduce((setSQL, field, index) =>
  setSQL + `${field}=:${field}` + ((index === fields.length - 1) ? '' : ', '), 'SET '
);

const buildModulesCreateQuery = (record) => {
  let table = 'Modules';
  let mutableFields = ['ModuleName', 'ModuleCode', 'ModuleLevel', 'ModuleYearID', 'ModuleLeaderID', 'ModuleImageURL'];
  const sql = `INSERT INTO ${table} ` + buildSetFields(mutableFields);
  return { sql, data: record };
};

const buildModulesReadQuery = (id, variant) => {
  let table = '((Modules LEFT JOIN Users ON ModuleLeaderID=UserID) LEFT JOIN Years ON ModuleYearID=YearID )';
  let fields = ['ModuleID', 'ModuleName', 'ModuleCode', 'ModuleLevel', 'ModuleYearID', 'ModuleLeaderID', 'ModuleImageURL', 'CONCAT(UserFirstname," ",UserLastname) AS ModuleLeaderName', 'YearName AS ModuleYearName'];
  let sql = '';

  switch (variant) {
    case 'leader':
      sql = `SELECT ${fields} FROM ${table} WHERE ModuleLeaderID=:ID`;
      break;
    case 'users':
      table = `Modulemembers INNER JOIN ${table} ON Modulemembers.ModulememberModuleID=Modules.ModuleID`;
      sql = `SELECT ${fields} FROM ${table} WHERE ModulememberUserID=:ID`;
      break;
    default:
      sql = `SELECT ${fields} FROM ${table}`;
      if (id) sql += ` WHERE ModuleID=:ID`;
  }

  return { sql, data: { ID: id } };
};

const buildModulesUpdateQuery = (record, id) => {
  let table = 'Modules';
  let mutableFields = ['ModuleName', 'ModuleCode', 'ModuleLevel', 'ModuleYearID', 'ModuleLeaderID', 'ModuleImageURL'];
  const sql = `UPDATE ${table} ` + buildSetFields(mutableFields) + ` WHERE ModuleID=:ModuleID`;
  return { sql, data: { ...record, ModuleID: id } };
};

const buildModulesDeleteQuery = (id) => {
  let table = 'Modules';
  const sql = `DELETE FROM ${table} WHERE ModuleID=:ModuleID`;
  return { sql, data: { ModuleID: id } };
};

// Data accessors --------------------------------

const create = async (record) => {
  try {
    const { sql, data } = buildModulesCreateQuery(record); 
    const status = await database.query(sql, data);

    const { isSuccess, result, message } = await read(status[0].insertId, null);
    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the inserted record: ${message}` };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

const read = async (id, variant) => {
  try {
    const { sql, data } = buildModulesReadQuery(id, variant);
    const [result] = await database.query(sql, data);
    return (result.length === 0)
      ? { isSuccess: false, result: null, message: 'No record(s) found' }
      : { isSuccess: true, result: result, message: 'Record(s) successfully recovered' };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

const update = async (record, id) => {
  try {
    const { sql, data } = buildModulesUpdateQuery(record, id);
    const status = await database.query(sql, data);
    if (status[0].affectedRows === 0)
      return { isSuccess: false, result: null, message: 'Failed to update record: no rows affected' };

    const { isSuccess, result, message } = await read(id, null);      
    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the updated record: ${message}` };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

const _delete = async (id) => {
  try {
    const { sql, data } = buildModulesDeleteQuery(id);
    const status = await database.query(sql, data);
    return status[0].affectedRows === 0
      ? { isSuccess: false, result: null, message: `Failed to delete record ${deleteQuery.data.ModuleID}` }
      : { isSuccess: true, result: null, message: 'Record successfully deleted' };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

// Controllers -----------------------------------

const getModulesController = async (req, res, variant) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const { isSuccess, result, message: accessorMessage } = await read(id, variant);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const postModulesController = async (req, res) => {
  const record = req.body;
  
  // Validate request

  // Access data
  const { isSuccess, result, message: accessorMessage } = await create(record);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(201).json(result);
};

const putModulesController = async (req, res) => {
  const id = req.params.id;
  const record = req.body;

  // Validate request

  // Access data
  const { isSuccess, result, message: accessorMessage } = await update(record, id);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const deleteModulesController = async (req, res) => {
  const id = req.params.id;

  // Validate request

  // Access data
  
  const { isSuccess, result, message: accessorMessage } = await _delete(id);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(204).json({ message: accessorMessage });
};

// Endpoints -------------------------------------

router.get('/', (req, res) => getModulesController(req, res, null));
router.get('/:id(\\d+)', (req, res) => getModulesController(req, res, null));
router.get('/leader/:id', (req, res) => getModulesController(req, res, 'leader'));
router.get('/users/:id', (req, res) => getModulesController(req, res, 'users'));
router.post('/', postModulesController);
router.put('/:id', putModulesController);
router.delete('/:id', deleteModulesController);

export default router;
