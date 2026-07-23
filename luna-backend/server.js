require('dotenv').config();
console.log("Token cargado:", process.env.MP_ACCESS_TOKEN);
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { Resend } = require('resend');

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Configuración Mercado Pago
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

// Configuración Resend para Mails
const resend = new Resend(process.env.RESEND_API_KEY);

// 1. RUTA PARA CREAR LA PREFERENCIA DE PAGO
app.post('/api/crear-preferencia', async (req, res) => {
    try {
        const { cliente, items } = req.body;

        // Formateamos los productos del carrito para Mercado Pago
        const itemsMP = items.map(prod => ({
            title: prod.nombre,
            unit_price: Number(prod.precio),
            quantity: Number(prod.cantidad),
            currency_id: 'ARS'
        }));

        const preference = new Preference(client);
        
        const result = await preference.create({
    body: {
        items: itemsMP,
        backUrls: {
            success: "http://127.0.0.1:5500/index.html?status=success",
            failure: "http://127.0.0.1:5500/index.html?status=failure",
            pending: "http://127.0.0.1:5500/index.html?status=pending"
        },
        autoReturn: "approved"
    }
});
        // Devolvemos la URL para redirigir al cliente a pagar
        res.json({ init_point: result.init_point });

    } catch (error) {
        console.error('Error al crear preferencia:', error);
        res.status(500).json({ error: 'No se pudo generar la preferencia de pago.' });
    }
});

// 2. RUTA WEBHOOK (RECIBE NOTIFICACIÓN DE PAGO APROBADO Y ENVÍA EMAIL)
app.post('/api/webhook-pago', async (req, res) => {
    try {
        const { type, data } = req.body;

        if (type === 'payment') {
            const paymentId = data.id;
            
            // Enviar mail transaccional automático
            await resend.emails.send({
                from: 'Luna Store <onboarding@resend.dev>',
                to: ['tu-email@gmail.com'], // Aquí va el correo destino
                subject: '¡Nueva compra confirmada en LUNA!',
                html: `
                    <h2>¡Gracias por tu compra!</h2>
                    <p>Tu pago ID <strong>#${paymentId}</strong> ha sido aprobado con éxito.</p>
                `
            });
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error en Webhook:', error);
        res.sendStatus(500);
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🔥 Servidor corriendo en http://localhost:${PORT}`);
});