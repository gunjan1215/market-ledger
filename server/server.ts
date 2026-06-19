import express from 'express';
import cors from 'cors';
import { pool } from './db';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/transactions', async (_, res) => {
  const result = await pool.query(
    'SELECT * FROM transactions ORDER BY date DESC'
  );

  res.json(result.rows);
});

app.post('/transactions', async (req, res) => {
  const { id, type, amount, date, note } = req.body;

  await pool.query(
    `INSERT INTO transactions
    (id,type,amount,date,note)
    VALUES ($1,$2,$3,$4,$5)`,
    [id, type, amount, date, note]
  );

  res.json({ success: true });
});

app.delete('/transactions/:id', async (req, res) => {
  await pool.query(
    'DELETE FROM transactions WHERE id = $1',
    [req.params.id]
  );

  res.json({ success: true });
});

app.listen(5000, () => {
  console.log('API running on port 5000');
});