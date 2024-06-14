import pkg from 'pg'

//pool de conexión, debería ir en un .env
const { Pool } = pkg;
const pool = new Pool({
    user : 'postgres',
    host : 'localhost',
    password : 'cambiarcontraseñá',
    database : 'skatepark', 
    port : 5432
});

export const getSkaters = async () => {
    let client;
    const consulta = { 
        name: 'select-skaters',
        text: 'SELECT * FROM skaters ORDER BY id ASC'
    };
    try {
        client = await pool.connect();
        const result = await client.query(consulta);
        return result.rows; 
    } catch (error) {
        console.error('Error fetching skaters:', error);
        throw error; 
    } finally {
        if (client) {
            client.release();
        }
    }
};


export const getSkater = async (userId) => {
    let client;
    const consulta = { 
        name: 'select-skater',
        text: 'SELECT * FROM skaters WHERE id = $1', 
        values : [userId]

    };
    try {
        client = await pool.connect();
        const result = await client.query(consulta);
        return result; 
    } catch (error) {
        console.error('Error fetching skaters:', error);
        throw error; 
    } finally {
        if (client) {
            client.release();
        }
    }
}

export const newSkater = async (obj) => {
    const values = Object.values(obj); 
    let client;
    const consulta = {
        name: 'insert-data',
        text: 'INSERT INTO skaters (email, nombre, password, anos_experiencia, especialidad, foto, estado) VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *',
        values: values 
    };

    try {
        client = await pool.connect();
        const result = await client.query(consulta);
        return result;
    } catch (err) {
        console.error('hubo un error', err);
        throw err;
    } finally {
        if (client) {
            client.release();
        }
    }
};


export const userLogin = async (email, password) => {
    try {
        //console.log("Email buscado:", email);
        const result = await pool.query('SELECT * FROM skaters WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            throw new Error('Credenciales inválidas'); 
        }

        const user = result.rows[0];
        if (password !== user.password) {
            throw new Error('Credenciales inválidas'); 
        }

        return user; 
    } catch (err) {
        throw err; 
    }
};


export const updateSkater = async (userId, updatedData) => {
    console.log('UPDAT4EANDO SKATER', userId)
    try {
        // Validar si el usuario existe
        const userResult = await pool.query('SELECT * FROM skaters WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const consulta = {
            name: 'update-skater',
            text: `UPDATE skaters SET nombre = $2, password = $3, anos_experiencia = $4, especialidad = $5  WHERE id = $1 RETURNING *`,
            values: [userId, updatedData.nombre, updatedData.password, updatedData.anios_experiencia, updatedData.especialidad]
        };

        const result = await pool.query(consulta);

        // Verificamos si la actualización fue exitosa
        if (result.rows.length === 0) {
            throw new Error('No se pudo actualizar el usuario');
        }

        return result.rows[0]; // Devolver los datos actualizados del usuario
    } catch (err) {
        throw err; 
    }
};

export const updateEstado = async (skaterId, estado) => {
    let client;

    try {
        client = await pool.connect();
        await client.query('UPDATE skaters SET estado = $1 WHERE id = $2', [estado, skaterId]);
    } catch (err) {
        console.error('Error al actualizar estado:', err);
        throw err;
    } finally {
        if (client) {
            client.release();
        }
    }
};
