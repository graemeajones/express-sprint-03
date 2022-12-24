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

// SQL builders

const buildSetFields = (fields) => fields.reduce((setSQL, field, index) =>
  setSQL + `${field}=:${field}` + ((index === fields.length - 1) ? '' : ', '), 'SET '
);

const buildModulemembersSelectSql = (id, variant) => {
  let table = '((Modulemembers LEFT JOIN Users ON ModulememberUserID=UserID) LEFT JOIN Modules ON ModulememberModuleID=ModuleID )';
  let fields = [
    'ModulememberID',
    'ModuleID', 'CONCAT(ModuleCode," ",ModuleName) AS ModuleName',
    'UserID', 'CONCAT(UserLastname," ",UserLastname) AS UserName'
  ];
  let sql = '';

  switch (variant) {
    default:
      sql = `SELECT ${fields} FROM ${table}`;
      if (id) sql += ` WHERE ModulememberID=${id}`;
  }

  return sql;
};

const buildModulesSelectSql = (id, variant) => {
  let table = '((Modules LEFT JOIN Users ON ModuleLeaderID=UserID) LEFT JOIN Years ON ModuleYearID=YearID )';
  let fields = ['ModuleID', 'ModuleName', 'ModuleCode', 'ModuleLevel', 'ModuleYearID', 'ModuleLeaderID', 'ModuleImageURL', 'CONCAT(UserFirstname," ",UserLastname) AS ModuleLeaderName', 'YearName AS ModuleYearName'];
  let sql = '';

  switch (variant) {
    case 'leader':
      sql = `SELECT ${fields} FROM ${table} WHERE ModuleLeaderID=${id}`;
      break;
    case 'users':
      table = `Modulemembers INNER JOIN ${table} ON Modulemembers.ModulememberModuleID=Modules.ModuleID`;
      sql = `SELECT ${fields} FROM ${table} WHERE ModulememberUserID=${id}`;
      break;
    default:
      sql = `SELECT ${fields} FROM ${table}`;
      if (id) sql += ` WHERE ModuleID=${id}`;
  }

  return sql;
};

const buildUsersSelectSql = (id, variant) => {
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
      sql = `SELECT ${fields} FROM ${table} WHERE GroupmemberGroupID=${id}`;
      break;
    default:
      sql = `SELECT ${fields} FROM ${table}`;
      if (id) sql += ` WHERE UserID=${id}`;
  }
  
  return sql;
};

const buildYearsSelectSql = (id, variant) => {
  let table = 'Years';
  let fields = ['YearID', 'YearName'];
  let sql = '';

  switch (variant) {
    default:
      sql = `SELECT ${fields} FROM ${table}`;
      if (id) sql += ` WHERE ModuleID=${id}`;
  }

  return sql;
};

const buildModulemembersInsertSql = () => {
  let table = 'Modulemembers';
  let mutableFields = ['ModulememberModuleID', 'ModulememberUserID'];
  return `INSERT INTO ${table} ` + buildSetFields(mutableFields);
};

const buildModulesInsertSql = () => {
  let table = 'Modules';
  let mutableFields = ['ModuleName', 'ModuleCode', 'ModuleLevel', 'ModuleYearID', 'ModuleLeaderID', 'ModuleImageURL'];
  return `INSERT INTO ${table} ` + buildSetFields(mutableFields);
};

const buildUsersInsertSql = () => {
  let table = 'Users';
  let mutableFields = ['UserFirstname', 'UserLastname', 'UserEmail', 'UserLevel', 'UserYearID', 'UserUsertypeID', 'UserImageURL'];
    return `INSERT INTO ${table} ` + buildSetFields(mutableFields);
};

const buildModulesUpdateSql = () => {
  let table = 'Modules';
  let mutableFields = ['ModuleName', 'ModuleCode', 'ModuleLevel', 'ModuleYearID', 'ModuleLeaderID', 'ModuleImageURL'];
  return `UPDATE ${table} ` + buildSetFields(mutableFields) + ` WHERE ModuleID=:ModuleID`;
};

const buildUsersUpdateSql = () => {
  let table = 'Modules';
  let mutableFields = ['UserFirstname', 'UserLastname', 'UserEmail', 'UserLevel', 'UserYearID', 'UserUsertypeID', 'UserImageURL'];
  return `UPDATE ${table} ` + buildSetFields(mutableFields) + ` WHERE ModuleID=:ModuleID`;
};

const buildModulesDeleteSql = () => {
  let table = 'Modules';
  return `DELETE FROM ${table} WHERE ModuleID=:ModuleID`;
};

const buildUsersDeleteSql = () => {
  let table = 'Users';
  return `DELETE FROM ${table} WHERE UserID=:UserID`;
};

// Create

const createModulemembers = async (sql, record) => {
  try {
    const status = await database.query(sql,record);

    const recoverRecordSql = buildModulemembersSelectSql(status[0].insertId, null);

    const { isSuccess, result, message } = await read(recoverRecordSql);
        
    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the inserted record: ${message}` };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

const createModules = async (sql, record) => {
  try {
    const status = await database.query(sql,record);

    const recoverRecordSql = buildModulesSelectSql(status[0].insertId, null);

    const { isSuccess, result, message } = await read(recoverRecordSql);
    
    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the inserted record: ${message}` };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

const createUsers = async (sql, record) => {
  try {
    const status = await database.query(sql,record);

    const recoverRecordSql = buildUsersSelectSql(status[0].insertId, null);

    const { isSuccess, result, message } = await read(recoverRecordSql);

    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the inserted record: ${message}` };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

// Read

const read = async (sql) => {
  try {
    const [result] = await database.query(sql);
    return (result.length === 0)
      ? { isSuccess: false, result: null, message: 'No record(s) found' }
      : { isSuccess: true, result: result, message: 'Record(s) successfully recovered' };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

// Update

const updateModules = async (sql, id, record) => {
  try {
    const status = await database.query(sql, { ...record, ModuleID: id } );

    if (status[0].affectedRows === 0)
      return { isSuccess: false, result: null, message: 'Failed to update record: no rows affected' };

    const recoverRecordSql = buildModulesSelectSql(id, null);

    const { isSuccess, result, message } = await read(recoverRecordSql);
        
    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the updated record: ${message}` };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

const updateUsers = async (sql, id, record) => {
  try {
    const status = await database.query(sql, { ...record, UserID: id } );

    if (status[0].affectedRows === 0)
      return { isSuccess: false, result: null, message: 'Failed to update record: no rows affected' };

    const recoverRecordSql = buildUsersSelectSql(id, null);

    const { isSuccess, result, message } = await read(recoverRecordSql);
        
    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the updated record: ${message}` };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

// Delete

const deleteModules = async (sql, id) => {
  try {
    const status = await database.query(sql, { ModuleID: id });
    
    return status[0].affectedRows === 0
      ? { isSuccess: false, result: null, message: `Failed to delete record ${id}` }
      : { isSuccess: true, result: null, message: 'Record successfully deleted' };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

const deleteUsers = async (sql, id) => {
  try {
    const status = await database.query(sql, { UserID: id });
    
    return status[0].affectedRows === 0
      ? { isSuccess: false, result: null, message: `Failed to delete record ${id}` }
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
  const sql = buildModulemembersSelectSql(id, variant);
  const { isSuccess, result, message: accessorMessage } = await read(sql);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const getModulesController = async (req, res, variant) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const sql = buildModulesSelectSql(id, variant);
  const { isSuccess, result, message: accessorMessage } = await read(sql);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const getUsersController = async (req, res, variant) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const sql = buildUsersSelectSql(id, variant);
  const { isSuccess, result, message: accessorMessage } = await read(sql);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const getYearsController = async (req, res, variant) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const sql = buildYearsSelectSql(id, variant);
  const { isSuccess, result, message: accessorMessage } = await read(sql);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

// POST Controllers

const postModulemembersController = async (req, res) => {
  const record = req.body;

  // Validate request

  // Access data
  const sql = buildModulemembersInsertSql();
  const { isSuccess, result, message: accessorMessage } = await createModulemembers(sql, record);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(201).json(result);
};

const postModulesController = async (req, res) => {
  const record = req.body;
  
  // Validate request

  // Access data
  const sql = buildModulesInsertSql();
  const { isSuccess, result, message: accessorMessage } = await createModules(sql, record);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(201).json(result);
};

const postUsersController = async (req, res) => {
  const record = req.body;

  // Validate request

  // Access data
  const sql = buildUsersInsertSql();
  const { isSuccess, result, message: accessorMessage } = await createUsers(sql, record);
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
  const sql = buildModulesUpdateSql();
  const { isSuccess, result, message: accessorMessage } = await updateModules(sql, id, record);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const putUsersController = async (req, res) => {
  const id = req.params.id;
  const record = req.body;

  // Validate request

  // Access data
  const sql = buildUsersUpdateSql();
  const { isSuccess, result, message: accessorMessage } = await updateUsers(sql, id, record);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

// DELETE Controllers

const deleteModulesController = async (req, res) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const sql = buildModulesDeleteSql();
  const { isSuccess, result, message: accessorMessage } = await deleteModules(sql, id);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(204).json({ message: accessorMessage });
};

const deleteUsersController = async (req, res) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const sql = buildUsersDeleteSql();
  const { isSuccess, result, message: accessorMessage } = await deleteUsers(sql, id);
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
