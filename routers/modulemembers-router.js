import { Router } from 'express';
import Model from '../models/Model.js';
import modelConfig from '../models/modulemembers-model.js';
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

// Endpoints -------------------------------------

const router = new Router();

router.get('/', (req, res) => getController(req, res, null));
router.get('/:id', (req, res) => getController(req, res, null));
router.post('/', postController);

export default router;
