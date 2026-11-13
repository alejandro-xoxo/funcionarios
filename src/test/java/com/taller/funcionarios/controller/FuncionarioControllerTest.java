package com.taller.funcionarios.controller;

import com.taller.funcionarios.model.Funcionario;
import com.taller.funcionarios.repository.FuncionarioRepository;
import com.taller.funcionarios.security.SecurityConfig;
import com.taller.funcionarios.service.FuncionarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Prueba la API (controlador + servicio reales) simulando solo el repositorio,
 * así no hace falta MySQL para ejecutar las pruebas.
 */
@WebMvcTest(FuncionarioController.class)
@Import({FuncionarioService.class, SecurityConfig.class})
@WithMockUser(username = "admin", roles = "ADMIN")
class FuncionarioControllerTest {

    private static final String URL = "/api/v1/funcionarios";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private FuncionarioRepository repositorio;

    private Funcionario ana() {
        return new Funcionario(1L, "Ana Pérez", "Analista", "Contabilidad", "3001234567");
    }

    @Test
    @WithAnonymousUser
    void sinCredencialesDevuelve401() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mvc.perform(delete(URL + "/1")).andExpect(status().isUnauthorized());
        verify(repositorio, never()).findAll(any(Sort.class));
    }

    @Test
    @WithAnonymousUser
    void paginaPublicaNoExigeCredenciales() throws Exception {
        mvc.perform(get("/js/app.js")).andExpect(status().isOk());
    }

    @Test
    void listarDevuelve200ConDatos() throws Exception {
        when(repositorio.findAll(any(Sort.class))).thenReturn(List.of(ana()));

        mvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nombre").value("Ana Pérez"));
    }

    @Test
    void listarVacioDevuelve204SinCuerpo() throws Exception {
        when(repositorio.findAll(any(Sort.class))).thenReturn(List.of());

        mvc.perform(get(URL))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
    }

    @Test
    void consultarPorIdExistenteDevuelve200() throws Exception {
        when(repositorio.findById(1L)).thenReturn(Optional.of(ana()));

        mvc.perform(get(URL + "/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void consultarPorIdInexistenteDevuelve404() throws Exception {
        when(repositorio.findById(99L)).thenReturn(Optional.empty());

        mvc.perform(get(URL + "/99")).andExpect(status().isNotFound());
    }

    @Test
    void registrarDevuelve201ConId() throws Exception {
        when(repositorio.save(any(Funcionario.class))).thenAnswer(inv -> {
            Funcionario f = inv.getArgument(0);
            f.setId(5L);
            return f;
        });

        mvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"  Luis  \",\"cargo\":\"Contador\",\"departamento\":\"Contabilidad\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/v1/funcionarios/5"))
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.nombre").value("Luis"));
    }

    @Test
    void registrarConIdDevuelve400() throws Exception {
        mvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":7,\"nombre\":\"Luis\",\"cargo\":\"Contador\",\"departamento\":\"Contabilidad\"}"))
                .andExpect(status().isBadRequest());
        verify(repositorio, never()).save(any());
    }

    @Test
    void registrarConIdNuloEsValido() throws Exception {
        when(repositorio.save(any(Funcionario.class))).thenAnswer(inv -> {
            Funcionario f = inv.getArgument(0);
            f.setId(6L);
            return f;
        });

        mvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":null,\"nombre\":\"Luis\",\"cargo\":\"Contador\",\"departamento\":\"Contabilidad\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void registrarSinCampoObligatorioOConEspaciosDevuelve400() throws Exception {
        mvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Luis\",\"departamento\":\"Contabilidad\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"   \",\"cargo\":\"Contador\",\"departamento\":\"Contabilidad\"}"))
                .andExpect(status().isBadRequest());
        verify(repositorio, never()).save(any());
    }

    @Test
    void actualizarExistenteDevuelve200YUsaElIdDeLaRuta() throws Exception {
        when(repositorio.findById(1L)).thenReturn(Optional.of(ana()));
        when(repositorio.save(any(Funcionario.class))).thenAnswer(inv -> inv.getArgument(0));

        mvc.perform(put(URL + "/1").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":99,\"nombre\":\"Ana Pérez\",\"cargo\":\"Jefa\",\"departamento\":\"Contabilidad\",\"telefono\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.cargo").value("Jefa"));
    }

    @Test
    void actualizarInexistenteDevuelve404() throws Exception {
        when(repositorio.findById(99L)).thenReturn(Optional.empty());

        mvc.perform(put(URL + "/99").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"X\",\"cargo\":\"Y\",\"departamento\":\"Z\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void eliminarDevuelve204O404() throws Exception {
        when(repositorio.findById(1L)).thenReturn(Optional.of(ana()));
        when(repositorio.findById(99L)).thenReturn(Optional.empty());

        mvc.perform(delete(URL + "/1")).andExpect(status().isNoContent());
        mvc.perform(delete(URL + "/99")).andExpect(status().isNotFound());
    }

    @Test
    void buscarPorNombreTienePrioridadSobreDepartamento() throws Exception {
        when(repositorio.findByNombreContainingIgnoreCaseOrderByIdAsc("ana")).thenReturn(List.of(ana()));

        mvc.perform(get(URL).param("nombre", " ana ").param("departamento", "Ventas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nombre").value("Ana Pérez"));
        verify(repositorio, never()).findByDepartamentoIgnoreCaseOrderByIdAsc(anyString());
    }

    @Test
    void filtroPorDepartamentoSinResultadosDevuelve204() throws Exception {
        when(repositorio.findByDepartamentoIgnoreCaseOrderByIdAsc("Ventas")).thenReturn(List.of());

        mvc.perform(get(URL).param("departamento", "Ventas"))
                .andExpect(status().isNoContent());
    }

    @Test
    void filtrosVaciosSeTratanComoAusentes() throws Exception {
        when(repositorio.findAll(any(Sort.class))).thenReturn(List.of(ana()));

        mvc.perform(get(URL).param("nombre", "   ").param("departamento", ""))
                .andExpect(status().isOk());
        verify(repositorio).findAll(any(Sort.class));
    }
}
