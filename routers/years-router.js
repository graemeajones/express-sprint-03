import { Router } from 'express';
import database from '../database.js';

const router = Router();

// Query builders --------------------------------

const buildSetFields = (fields) => fields.reduce((setSQL, field, index) =>
  setSQL + `${field}=:${field}` + ((index === fields.length - 1) ? '' : ', '), 'SET '
);

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

// Data accessors --------------------------------

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

// Endpoints -------------------------------------

router.get('/', (req, res) => getYearsController(req, res, null));

export default router;
