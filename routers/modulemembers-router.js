import { Router } from 'express';
import database from '../database.js';

const router = Router();

// Query builders --------------------------------

const buildSetFields = (fields) => fields.reduce((setSQL, field, index) =>
  setSQL + `${field}=:${field}` + ((index === fields.length - 1) ? '' : ', '), 'SET '
);

const buildModulemembersReadQuery = (id, variant) => {
  let table = '((Modulemembers LEFT JOIN Users ON ModulememberUserID=UserID) LEFT JOIN Modules ON ModulememberModuleID=ModuleID )';
  let fields = [
    'ModulememberID',
    'ModulememberModuleID', 'CONCAT(ModuleCode," ",ModuleName) AS ModulememberModuleName',
    'ModulememberUserID', 'CONCAT(UserFirstname," ",UserLastname) AS ModulememberUserName'
  ];
  let sql = '';

  switch (variant) {
    default:
      sql = `SELECT ${fields} FROM ${table}`;
      if (id) sql += ` WHERE ModulememberID=:ID`;
  }

  return { sql, data: { ID: id } };
};

const buildModulemembersCreateQuery = (record) => {
  let table = 'Modulemembers';
  let mutableFields = ['ModulememberModuleID', 'ModulememberUserID'];
  const sql = `INSERT INTO ${table} ` + buildSetFields(mutableFields);
  return { sql, data: record }; 
};

// Data accessors --------------------------------

const createModulemembers = async (createQuery) => {
  try {
    const status = await database.query(createQuery.sql, createQuery.data);

    const readQuery = buildModulemembersReadQuery(status[0].insertId, null);

    const { isSuccess, result, message } = await read(readQuery);
        
    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the inserted record: ${message}` };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

const read = async (readQuery) => {
  try {
    const [result] = await database.query(readQuery.sql, readQuery.data);
    return (result.length === 0)
      ? { isSuccess: false, result: null, message: 'No record(s) found' }
      : { isSuccess: true, result: result, message: 'Record(s) successfully recovered' };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

// Controllers -----------------------------------

const getModulemembersController = async (req, res, variant) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const query = buildModulemembersReadQuery(id, variant);
  const { isSuccess, result, message: accessorMessage } = await read(query);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const postModulemembersController = async (req, res) => {
  const record = req.body;

  // Validate request

  // Access data
  const query = buildModulemembersCreateQuery(record);
  const { isSuccess, result, message: accessorMessage } = await createModulemembers(query);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(201).json(result);
};

// Endpoints -------------------------------------

router.get('/', (req, res) => getModulemembersController(req, res, null));
router.get('/:id', (req, res) => getModulemembersController(req, res, null));
router.post('/', postModulemembersController);

export default router;
