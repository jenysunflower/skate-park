//Importar dependencias
import express from 'express';
import { create } from 'express-handlebars';
import expresFileUpload from 'express-fileupload';
import path from 'path';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { 
    getSkaters,
    newSkater,
    userLogin,
    getSkater,
    updateSkater,
    updateEstado 
 } from './consultas.js'; // Ruta relativas

const app = express();
const PORT = 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const secretKey = 'superllave'// esto se guarda en un .env y no se sube

app.use(express.json());// Middleware para parsear JSON 
app.use(cookieParser())// Middleware para parsear cookies

//Se realiza apertura de los middlewares
app.use(express.urlencoded({extended : false}))
app.use(express.json())//Para poder recibir información
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css'))); // Note the 'node_modules' path for Bootstrap
app.use('/axios', express.static(path.join(__dirname, 'node_modules/axios/dist'))); 

//Se habilita middleware de fileupload, se configura
app.use(expresFileUpload({
    limit : 5000000,  //se limita el tamaño del archivo
    abortOnLimit : true,
    responseOnLimit : 'El tamaño del archivo supera los 5 megabytes'
}));

//Se configura el motor de plantilla Handlebars
const hbs = create({
    partialsDir : [
        'views/'
    ]
})

app.engine('handlebars', hbs.engine); 
app.set('view engine', 'handlebars');

//Creamos las rutas
// Ruta para obtener todos los skaters
app.get('/', async (req, res) => {
    try {
        const skaters = await getSkaters();

        res.render('home', {
            layout: 'main',
            skaters: skaters 
        });
    } catch (err) {
        console.error("Error al obtener skaters o renderizar la página:", err);
        res.status(500).send({
            error: `Algo salió mal`,
            code: 500
        });
    }
});

app.get('/registro', (req, res) => {
        res.render('registro', {
            layout :'main'
        })
})

app.get('/login', (req, res) => {
    res.render('login', {
        layout :'main'
    })
})

// Registrarse como usuario nuevo
app.post('/skaters', async (req, res) => {
    try {
        const { email, nombre, password, password2, anios_experiencia, especialidad } = req.body;

        if (password !== password2) {
            return res.status(400).send({
                error: 'Las contraseñas no coinciden',
                code: 400
            });
        }

        if (Object.keys(req.files).length == 0) {
            return res.status(400).send({
                error: 'No se cargó ningún archivo',
                code: 400
            });
        }

        const { files } = req;
        const { foto } = files;
        const { name } = foto;
        const urlImagen = `/upload/${name}`; // Path para la base de datos

        foto.mv(`${__dirname}/public${urlImagen}`, async (err) => {
            try {
                if (err) {
                    console.error(err);
                    return res.status(500).send({
                        error: 'Error al guardar la imagen',
                        code: 500
                    });
                } else {
                    const skate = {
                        email,
                        nombre,
                        password: password2,
                        anios_experiencia,
                        especialidad,
                        foto: urlImagen
                    };
                    await newSkater(skate);
                    res.status(201).redirect('/login');
                }
            } catch (err) {
                console.error('Hubo un problema al guardar el skater:', err);
                res.status(500).send({
                    error: `Algo salió mal ${err}`,
                    code: 500
                });
            }
        });
    } catch (err) {
        console.error('Error general en el registro:', err);
        res.status(500).send({
            error: `Algo salió mal ${err}`,
            code: 500
        });
    }
});

// Iniciar sesion
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    //console.log(req.body)
    try {
        const user = await userLogin(email, password);
        if (user) {
            const token = jwt.sign(
                {
                    exp: Math.floor(Date.now() / 1000) + (60 * 60), 
                    data: { id: user.id, email: user.email }
                },
                secretKey
            );   
            console.log('POST LOGIN USERID: ', user.id)   
            
            res.cookie('token', token, { httpOnly: true });       
            res.redirect(`/perfil/${user.id}`)    
        } else {
            res.status(401).json({ message: "Credenciales inválidas" });
        }
    } catch (err) {
        res.status(500).json({ message: "Error en el servidor"});
        console.log('ERROR EN LOGIN', err)
    }
});





// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    console.log('Middleware authenticateToken ejecutado'); 
    const token = req.cookies.token;

    if (!token) {
        return res.sendStatus(401); // No autorizado si no hay token
    }

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Prohibido si el token es inválido
        }
        req.user = user;
        next();
    });
};

// Rutas protegidas (con middleware de autenticación)
app.use(authenticateToken);

// Obtener el perfil
app.get('/perfil/:id', authenticateToken, async (req, res) => {
    const userId = req.params.id;
    try {
        // Verificar si el usuario que realiza la solicitud es el mismo que se va a actualizar
        if (req.user.data.id !== parseInt(userId, 10)) {
            return res.status(403).json({ message: 'No tienes permiso para ver este perfil' });
        }
        
        const result = await getSkater(userId);
        const user = result.rows[0];
        //console.log('RESULTADO USER', user);

        if (user) {
            // Renderiza el perfil con los datos del usuario
            res.render('perfil', { 
                layout: 'main',
                email: user.email, 
                nombre: user.nombre,
                anios_experiencia: user.anos_experiencia,
                especialidad: user.especialidad,
                foto: user.foto,
                userId: userId // Pasar el userId a la plantilla para la actualización
            });
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    } catch (err) {
        console.error('Error al obtener datos del usuario:', err);
        res.status(500).send('Error en el servidor');
    }
});

// Editar el perfil
app.put('/perfil/:id', authenticateToken, async (req, res) => {
    const userId = req.user.data.id;
    const dataActualizar = req.body; 
    console.log('PUT PERFIL PARAMS', req.user.data.id)

    try {
        const skaterActualizado = await updateSkater(userId, dataActualizar);
        res.json(skaterActualizado); 
    } catch (error) {
        if (error.message === 'Usuario no encontrado') {
            res.status(404).json({ message: error.message });
        } else if (error.message === 'No se pudo actualizar el usuario') {
            res.status(500).json({ message: error.message });
        } else {
            console.error('Error al actualizar skater:', error);
            res.status(500).json({ message: 'Error en el servidor' });
        }
    }
});


app.get('/admin', async (req, res) => {
    try {
        const skaters = await getSkaters();

        res.render('admin', { // Renderiza la plantilla 'admin'
            layout: 'main',   // Usa el mismo layout (si es necesario)
            skaters: skaters // Pasa los datos de los skaters a la plantilla
        });
    } catch (err) {
        console.error("Error al obtener skaters o renderizar la página:", err);
        res.status(500).send({
            error: `Algo salió mal`,
            code: 500
        });
    }
});

app.put('/admin/:id', async (req, res) => {
    const skaterId = req.params.id;
    const { estado } = req.body;
    console.log('SKATER APROBADO', skaterId)

    try {
        await updateEstado(skaterId, estado); 
        res.json({ message: 'Estado actualizado correctamente' });
    } catch (err) {
        console.error('Error al actualizar estado:', err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

//Escuchando puerto
app.listen(PORT, () => console.log('Servidor encendido'))

