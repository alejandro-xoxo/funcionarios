package com.taller.funcionarios.security;

import com.taller.funcionarios.model.Usuario;
import com.taller.funcionarios.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea el usuario administrador en la tabla "usuarios" la primera vez que arranca la aplicación.
 * Si ya existe, no lo modifica.
 */
@Component
public class DatosIniciales implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatosIniciales.class);

    private final UsuarioRepository repositorio;
    private final PasswordEncoder encoder;
    private final String adminUsuario;
    private final String adminPassword;

    public DatosIniciales(UsuarioRepository repositorio,
                          PasswordEncoder encoder,
                          @Value("${app.seguridad.admin.usuario}") String adminUsuario,
                          @Value("${app.seguridad.admin.password}") String adminPassword) {
        this.repositorio = repositorio;
        this.encoder = encoder;
        this.adminUsuario = adminUsuario;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        if (repositorio.existsByUsername(adminUsuario)) {
            return;
        }
        repositorio.save(new Usuario(adminUsuario, encoder.encode(adminPassword), "ADMIN"));
        log.info("Usuario administrador '{}' creado en la tabla usuarios", adminUsuario);
    }
}
