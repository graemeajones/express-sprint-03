import { Router } from 'express';
import { buildCreateQuery, buildReadQuery, buildUpdateQuery, buildDeleteQuery } from '../models/modules-model.js';
import database from './database.js';

const router = Router();

// Data accessors --------------------------------

const createModules = async (createQuery) => {
  try {
    const status = await database.query(createQuery.sql, createQuery.data);

    const readQuery = buildReadQuery(status[0].insertId, null);

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

const updateModules = async (updateQuery) => {
  try {
    const status = await database.query(updateQuery.sql, updateQuery.data);

    if (status[0].affectedRows === 0)
      return { isSuccess: false, result: null, message: 'Failed to update record: no rows affected' };

    const readQuery = buildReadQuery(updateQuery.data.ModuleID, null);

    const { isSuccess, result, message } = await read(readQuery);
        
    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the updated record: ${message}` };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

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

// Controllers -----------------------------------

const getModulesController = async (req, res, variant) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const query = buildReadQuery(id, variant);
  const { isSuccess, result, message: accessorMessage } = await read(query);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const postModulesController = async (req, res) => {
  const record = req.body;
  
  // Validate request

  // Access data
  const query = buildCreateQuery(record); 
  const { isSuccess, result, message: accessorMessage } = await createModules(query);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(201).json(result);
};

const putModulesController = async (req, res) => {
  const id = req.params.id;
  const record = req.body;

  // Validate request

  // Access data
  const query = buildUpdateQuery(record, id);
  const { isSuccess, result, message: accessorMessage } = await updateModules(query);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const deleteModulesController = async (req, res) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const query = buildDeleteQuery(id);
  const { isSuccess, result, message: accessorMessage } = await deleteModules(query);
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
