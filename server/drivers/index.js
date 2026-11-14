import validate from './validate.js';
import bigquery from './bigquery/index.js';
import clickhouse from './clickhouse/index.js';
import drill from './drill/index.js';
import hdb from './hdb/index.js';
import mysql2 from './mysql2/index.js';
import pinot from './pinot/index.js';
import postgres from './postgres/index.js';
import presto from './presto/index.js';
import redshift from './redshift/index.js';
import sqlite from './sqlite/index.js';
import sqlserver from './sqlserver/index.js';
import trino from './trino/index.js';

const drivers = {
  bigquery,
  clickhouse,
  drill,
  hdb,
  mysql2,
  pinot,
  postgres,
  presto,
  redshift,
  sqlite,
  sqlserver,
  trino,
};

/**
 * Drivers that were supported by earlier versions of SQLPad and have been removed.
 * Connections saved with one of these drivers still load, but cannot be used.
 * Keys are driver ids, values are display names.
 */
export const removedDrivers = {
  athena: 'Athena',
  cassandra: 'Cassandra',
  crate: 'Crate',
  mysql: 'MySQL (legacy driver, use mysql2)',
  unixodbc: 'unixODBC',
  vertica: 'Vertica',
};

/**
 * Error message for a driver id that has no implementation.
 * @param {string} driver
 */
export function driverNotAvailableMessage(driver) {
  if (removedDrivers[driver]) {
    return `Driver "${driver}" (${removedDrivers[driver]}) is no longer supported by this version of SQLPad.`;
  }
  return `Driver "${driver}" is not available.`;
}

// Validate each driver implementation to ensure it matches expectations
Object.keys(drivers).forEach((id) => {
  const driver = drivers[id];
  validate(id, driver);
});

export default drivers;
