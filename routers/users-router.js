import { Router } from 'express';
import database from '../database.js';

const router = Router();

// Query builders --------------------------------

const buildSetFields = (fields) => fields.reduce((setSQL, field, index) =>
  setSQL + `${field}=:${field}` + ((index === fields.length - 1) ? '' : ', '), 'SET '
);

const buildUsersReadQuery = (id, variant) => {
  let table = '((Users LEFT JOIN Usertypes ON UserUsertypeID=UsertypeID) LEFT JOIN Years ON UserYearID=YearID )';
  let fields = ['UserID', 'UserFirstname', 'UserLastname', 'UserEmail', 'UserLevel', 'UserYearID', 'UserUsertypeID', 'UserImageURL', 'UsertypeName AS UserUsertypeName', 'YearName AS UserYearName'];
  let sql = '';

  const STAFF = 1; // Primary key for staff type in Unibase Usertypes table
  const STUDENT = 2; // Primary key for student type in Unibase Usertypes table

  switch (variant) {
    case 'student':
      sql = `SELECT ${fields} FROM ${table} WHERE UserUsertypeID=${STUDENT}`;
      break;
    case 'staff':
      sql = `SELECT ${fields} FROM ${table} WHERE UserUsertypeID=${STAFF}`;
      break;
    case 'groups':
      table = `Groupmembers INNER JOIN ${table} ON Groupmembers.GroupmemberUserID=Users.UserID`;
      sql = `SELECT ${fields} FROM ${table} WHERE GroupmemberGroupID=:ID`;
      break;
    default:
      sql = `SELECT ${fields} FROM ${table}`;
      if (id) sql += ` WHERE UserID=:ID`;
  }
  
  return { sql, data: { ID: id } };
};

const buildUsersCreateQuery = (record) => {
  let table = 'Users';
  let mutableFields = ['UserFirstname', 'UserLastname', 'UserEmail', 'UserLevel', 'UserYearID', 'UserUsertypeID', 'UserImageURL'];
  const sql = `INSERT INTO ${table} ` + buildSetFields(mutableFields);
  return { sql, data: record };
};

const buildUsersUpdateQuery = (record, id) => {
  let table = 'Users';
  let mutableFields = ['UserFirstname', 'UserLastname', 'UserEmail', 'UserLevel', 'UserYearID', 'UserUsertypeID', 'UserImageURL'];
  const sql = `UPDATE ${table} ` + buildSetFields(mutableFields) + ` WHERE UserID=:UserID`;
  return { sql, data: { ...record, UserID: id } };
};

const buildUsersDeleteQuery = (id) => {
  let table = 'Users';
  const sql = `DELETE FROM ${table} WHERE UserID=:UserID`;
  return { sql, data: { UserID: id } };
};

// Data accessors --------------------------------

const createUsers = async (createQuery) => {
  try {
    const status = await database.query(createQuery.sql, createQuery.data);

    const readQuery = buildUsersReadQuery(status[0].insertId, null);

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

const updateUsers = async (updateQuery) => {
  try {
    const status = await database.query(updateQuery.sql, updateQuery.data);

    if (status[0].affectedRows === 0)
      return { isSuccess: false, result: null, message: 'Failed to update record: no rows affected' };

    const readQuery = buildUsersReadQuery(updateQuery.data.UserID, null);

    const { isSuccess, result, message } = await read(readQuery);
        
    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the updated record: ${message}` };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

const deleteUsers = async (deleteQuery) => {
  try {
    const status = await database.query(deleteQuery.sql, deleteQuery.data);
    
    return status[s].affectedRows === 0
      ? { isSuccess: false, result: null, message: `Failed to delete record ${deleteQuery.data.UserID}` }
      : { isSuccess: true, result: null, message: 'Record successfully deleted' };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

// Controllers -----------------------------------

const getUsersController = async (req, res, variant) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const query = buildUsersReadQuery(id, variant);
  const { isSuccess, result, message: accessorMessage } = await read(query);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const postUsersController = async (req, res) => {
  const record = req.body;

  // Validate request

  // Access data
  const query = buildUsersCreateQuery(record);
  const { isSuccess, result, message: accessorMessage } = await createUsers(query);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(201).json(result);
};

const putUsersController = async (req, res) => {
  const id = req.params.id;
  const record = req.body;

  // Validate request

  // Access data
  const query = buildUsersUpdateQuery(record, id);
  const { isSuccess, result, message: accessorMessage } = await updateUsers(query);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const deleteUsersController = async (req, res) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const query = buildUsersDeleteQuery(id);
  const { isSuccess, result, message: accessorMessage } = await deleteUsers(query);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(204).json({ message: accessorMessage });
};

// Endpoints -------------------------------------

router.get('/', (req, res) => getUsersController(req, res, null));
router.get('/:id(\\d+)', (req, res) => getUsersController(req, res, null));
router.get('/student', (req, res) => getUsersController(req, res, 'student'));
router.get('/staff', (req, res) => getUsersController(req, res, 'staff'));
router.get('/groups/:id', (req, res) => getUsersController(req, res, 'groups'));
router.post('/', postUsersController);
router.put('/:id', putUsersController);
router.delete('/:id', deleteUsersController);

export default router;
