// Imports ---------------------------------------
import express from 'express';
import cors from 'cors';
import database from './database.js';

// Configure express app -------------------------
const app = new express();

// Configure middleware --------------------------
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Controllers -----------------------------------

// SQL prepared statement builders

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

const buildYearsReadQuery = (id, variant) => {
  let table = 'Years';
  let fields = ['YearID', 'YearName'];
  let sql = '';

  switch (variant) {
    default:
      sql = `SELECT ${fields} FROM ${table}`;
      if (id) sql += ` WHERE YearID=:ID`;
  }

  return { sql, data: { ID: id } };
};

const buildModulemembersCreateQuery = (record) => {
  let table = 'Modulemembers';
  let mutableFields = ['ModulememberModuleID', 'ModulememberUserID'];
  const sql = `INSERT INTO ${table} ` + buildSetFields(mutableFields);
  return { sql, data: record }; 
};

const buildModulesCreateQuery = (record) => {
  let table = 'Modules';
  let mutableFields = ['ModuleName', 'ModuleCode', 'ModuleLevel', 'ModuleYearID', 'ModuleLeaderID', 'ModuleImageURL'];
  const sql = `INSERT INTO ${table} ` + buildSetFields(mutableFields);
  return { sql, data: record };
};

const buildUsersCreateQuery = (record) => {
  let table = 'Users';
  let mutableFields = ['UserFirstname', 'UserLastname', 'UserEmail', 'UserLevel', 'UserYearID', 'UserUsertypeID', 'UserImageURL'];
  const sql = `INSERT INTO ${table} ` + buildSetFields(mutableFields);
  return { sql, data: record };
};

const buildModulesUpdateQuery = (record, id) => {
  let table = 'Modules';
  let mutableFields = ['ModuleName', 'ModuleCode', 'ModuleLevel', 'ModuleYearID', 'ModuleLeaderID', 'ModuleImageURL'];
  const sql = `UPDATE ${table} ` + buildSetFields(mutableFields) + ` WHERE ModuleID=:ModuleID`;
  return { sql, data: { ...record, ModuleID: id } };
};

const buildUsersUpdateQuery = (record, id) => {
  let table = 'Users';
  let mutableFields = ['UserFirstname', 'UserLastname', 'UserEmail', 'UserLevel', 'UserYearID', 'UserUsertypeID', 'UserImageURL'];
  const sql = `UPDATE ${table} ` + buildSetFields(mutableFields) + ` WHERE UserID=:UserID`;
  return { sql, data: { ...record, UserID: id } };
};

const buildModulesDeleteQuery = (id) => {
  let table = 'Modules';
  const sql = `DELETE FROM ${table} WHERE ModuleID=:ModuleID`;
  return { sql, data: { ModuleID: id } };
};

const buildUsersDeleteQuery = (id) => {
  let table = 'Users';
  const sql = `DELETE FROM ${table} WHERE UserID=:UserID`;
  return { sql, data: { UserID: id } };
};

// Create

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

const createModules = async (createQuery) => {
  try {
    const status = await database.query(createQuery.sql, createQuery.data);

    const readQuery = buildModulesReadQuery(status[0].insertId, null);

    const { isSuccess, result, message } = await read(readQuery);
    
    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the inserted record: ${message}` };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

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

// Read

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

// Update

const updateModules = async (updateQuery) => {
  try {
    const status = await database.query(updateQuery.sql, updateQuery.data);

    if (status[0].affectedRows === 0)
      return { isSuccess: false, result: null, message: 'Failed to update record: no rows affected' };

    const readQuery = buildModulesReadQuery(updateQuery.data.ModuleID, null);

    const { isSuccess, result, message } = await read(readQuery);
        
    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the updated record: ${message}` };
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

// Delete

const deleteModules = async (deleteQuery) => {
  try {
    const status = await database.query(deleteQuery.sql, deleteQuery.data);
    
    return status[0].affectedRows === 0
      ? { isSuccess: false, result: null, message: `Failed to delete record ${deleteQuery.data.ModuleID}` }
      : { isSuccess: true, result: null, message: 'Record successfully deleted' };
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

// GET Controllers

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

const getModulesController = async (req, res, variant) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const query = buildModulesReadQuery(id, variant);
  const { isSuccess, result, message: accessorMessage } = await read(query);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

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

const getYearsController = async (req, res, variant) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const query = buildYearsReadQuery(id, variant);
  const { isSuccess, result, message: accessorMessage } = await read(query);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

// POST Controllers

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

const postModulesController = async (req, res) => {
  const record = req.body;
  
  // Validate request

  // Access data
  const query = buildModulesCreateQuery(record); 
  const { isSuccess, result, message: accessorMessage } = await createModules(query);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(201).json(result);
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

// PUT Controllers

const putModulesController = async (req, res) => {
  const id = req.params.id;
  const record = req.body;

  // Validate request

  // Access data
  const query = buildModulesUpdateQuery(record, id);
  const { isSuccess, result, message: accessorMessage } = await updateModules(query);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
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

// DELETE Controllers

const deleteModulesController = async (req, res) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const query = buildModulesDeleteQuery(id);
  const { isSuccess, result, message: accessorMessage } = await deleteModules(query);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(204).json({ message: accessorMessage });
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
// Modulemembers
app.get('/api/modulemembers', (req, res) => getModulemembersController(req, res, null));
app.get('/api/modulemembers/:id', (req, res) => getModulemembersController(req, res, null));

app.post('/api/modulemembers', postModulemembersController);

// Modules
app.get('/api/modules', (req, res) => getModulesController(req, res, null));
app.get('/api/modules/:id(\\d+)', (req, res) => getModulesController(req, res, null));
app.get('/api/modules/leader/:id', (req, res) => getModulesController(req, res, 'leader'));
app.get('/api/modules/users/:id', (req, res) => getModulesController(req, res, 'users'));

app.post('/api/modules', postModulesController);
app.put('/api/modules/:id', putModulesController);
app.delete('/api/modules/:id', deleteModulesController);

// Users
app.get('/api/users', (req, res) => getUsersController(req, res, null));
app.get('/api/users/:id(\\d+)', (req, res) => getUsersController(req, res, null));
app.get('/api/users/student', (req, res) => getUsersController(req, res, 'student'));
app.get('/api/users/staff', (req, res) => getUsersController(req, res, 'staff'));
app.get('/api/users/groups/:id', (req, res) => getUsersController(req, res, 'groups'));

app.post('/api/users', postUsersController);
app.put('/api/users/:id', putUsersController);
app.delete('/api/users/:id', deleteUsersController);

// Years
app.get('/api/years', (req, res) => getYearsController(req, res, null));
app.get('/api/years/:id', (req, res) => getYearsController(req, res, null));

// Start server ----------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT,() => console.log(`Server started on port ${PORT}`));
