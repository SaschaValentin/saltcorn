const View = require("./view");
const Field = require("./field");
const Table = require("./table");
const { getState } = require("../db/state");
const { generate_attributes } = require("../plugin-testing");
const { contract, is } = require("contractis");
const db = require("../db");

const random_table = async () => {
  const name = is
    .and(
      is.sat((s) => db.sqlsanitize(s).length > 1),
      is.str
    )
    .generate();
  const table = await Table.create(name);
  //fields
  const nfields = is.integer({ gte: 1, lte: 10 }).generate();
  const existing_field_names = ["id"];
  for (let index = 0; index < nfields; index++) {
    const field = await random_field(existing_field_names);
    existing_field_names.push(field.label);
    field.table_id = table.id;
    await Field.create(field);
  }
  //fill rows
  for (let index = 0; index < 20; index++) {
    await fill_table_row(table);
  }
  return table;
};

const fill_table_row = async (table) => {
  const fields = await table.getFields();
  const row = {};
  for (const f of fields) {
    if (f.required || is.bool.generate()) row[f.name] = await f.generate();
  }
  //console.log(fields, row);
  await table.tryInsertRow(row);
};

const random_field = async (existing_field_names) => {
  const tables = await Table.find({});
  const fkey_opts = [
    ...tables.map((t) => `Key to ${t.name}`),
    "Key to users",
    "File",
  ];
  const type_options = getState().type_names.concat(fkey_opts || []);
  const type = is.one_of(type_options).generate();

  const label = is
    .and(
      is.sat(
        (s) =>
          s.length > 1 && !existing_field_names.includes(Field.labelToName(s))
      ),
      is.str
    )
    .generate();
  const f = new Field({ type, label });
  if (f.type.attributes) f.attributes = generate_attributes(f.type.attributes);

  // unique?
  if (Math.random() < 0.25 && type !== "Bool") f.is_unique = true;
  // required?
  if (is.bool.generate()) f.required = true;
  return f;
};

const random_list_view = async (table) => {
  const fields = await table.getFields();
  const columns = fields.map((f) => ({
    type: "Field",
    field_name: f.name,
    state_field: is.bool.generate(),
  }));
  const name = is.str.generate();
  const view = await View.create({
    name,
    configuration: { columns },
    viewtemplate: "List",
    table_id: table.id,
    min_role: 10,
    on_root_page: false,
  });
  return view;
};

module.exports = { random_table, fill_table_row, random_list_view };
