const perfilForm = document.getElementById('perfilForm');
const nombreInput = perfilForm.querySelector('input[name="nombre"]');
const passwordInput = perfilForm.querySelector('input[name="password"]');
const password2Input = perfilForm.querySelector('input[name="password2"]');
const experienciaInput = perfilForm.querySelector('input[name="anios_experiencia"]');
const especialidadInput = perfilForm.querySelector('input[name="especialidad"]');

perfilForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevenir la recarga automática
    console.log('Botón Actualizar clickeado');

    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    console.log('PERFILFORM EVENTLISTENER USERIID: ', userId)
    // Crea un objeto con los datos actualizados
    const updatedData = {

        nombre: nombreInput.value,
        password: passwordInput.value,
        anios_experiencia: experienciaInput.value,
        especialidad: especialidadInput.value
    };

    // Validación de contraseñas
    if (passwordInput.value !== password2Input.value) {
        alert('Las contraseñas no coinciden');
        return;
    }

    try {
        const response = await fetch(`/perfil/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            const updatedSkater = await response.json();
            nombreInput.value = updatedSkater.nombre;
            alert('Perfil actualizado correctamente');
            // Recargar la página después de la actualización
            window.location.reload();
        } else {
            const errorData = await response.json();
            alert(`Error al actualizar: ${errorData.message}`);
        }
    } catch (err) {
        console.error('Error al enviar la solicitud:', err);
        alert('Error en el servidor');
    }
});


const actualizarEstadoBotones = document.querySelectorAll('.actualizar-estado'); 
actualizarEstadoBotones.forEach(boton => {
    boton.addEventListener('click', async (event) => {
        const skaterId = event.target.dataset.skaterId;
        const checkbox = event.target.closest('tr').querySelector('input[type="checkbox"]');
        const nuevoEstado = checkbox.checked;

        try {
            const response = await fetch(`/admin/${skaterId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (response.ok) {
                alert('Estado actualizado correctamente');
            } else {
                const errorData = await response.json();
                alert(`Error al actualizar: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error en el servidor');
        }
    });
});
