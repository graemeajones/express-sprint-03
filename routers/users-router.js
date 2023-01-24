import { Router } from 'express';
import Model from '../models/Model.js';
import modelConfig from '../models/users-model.js';
import database from '../database.js';
import Accessor from '../accessor/Accessor.js';

// Model -----------------------------------------

const model = new Model(modelConfig);

// Data accessor ---------------------------------

const accessor = new Accessor(model, database);

// Controllers -----------------------------------

const getController = async (req, res, variant) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const { isSuccess, result, message: accessorMessage } = await accessor.read(id, variant);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const postController = async (req, res) => {
  const record = req.body;

  // Validate request

  // Access data
  const { isSuccess, result, message: accessorMessage } = await accessor.create(record);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(201).json(result);
};

const putController = async (req, res) => {
  const id = req.params.id;
  const record = req.body;

  // Validate request

  // Access data
  const { isSuccess, result, message: accessorMessage } = await accessor.update(record, id);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const deleteController = async (req, res) => {
  const id = req.params.id;

  // Validate request

  // Access data
  const { isSuccess, result, message: accessorMessage } = await accessor.delete(id);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(204).json({ message: accessorMessage });
};

// Endpoints -------------------------------------

const router = new Router();

router.get('/', (req, res) => getController(req, res, null));
router.get('/:id(\\d+)', (req, res) => getController(req, res, null));
router.get('/student', (req, res) => getController(req, res, 'student'));
router.get('/staff', (req, res) => getController(req, res, 'staff'));
router.get('/groups/:id', (req, res) => getController(req, res, 'groups'));
router.post('/', postController);
router.put('/:id', putController);
router.delete('/:id', deleteController);

export default router;
