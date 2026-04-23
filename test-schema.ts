import { Schema, SchemaType } from '@google/generative-ai';

const s: Schema = {
  type: SchemaType.STRING,
  enum: ['a', 'b'],
  format: 'enum'
};
