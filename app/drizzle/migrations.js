import journal from './meta/_journal.json';
import m0000 from './0000_esquema-inicial.sql';
import m0001 from './0001_grupos-musculares.sql';
import m0002 from './0002_catalogo-inicial.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  