package com.taller.funcionarios.service;

import com.taller.funcionarios.exception.FuncionarioNoEncontradoException;
import com.taller.funcionarios.exception.SolicitudInvalidaException;
import com.taller.funcionarios.model.Funcionario;
import com.taller.funcionarios.repository.FuncionarioRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Reglas de negocio del directorio de funcionarios.
 */
@Service
public class FuncionarioService {

    private final FuncionarioRepository repositorio;

    public FuncionarioService(FuncionarioRepository repositorio) {
        this.repositorio = repositorio;
    }

    /**
     * Lista funcionarios aplicando, si llegan, los filtros de búsqueda.
     * Los filtros vacíos o con solo espacios se ignoran; si llegan ambos, se usa el de nombre.
     */
    @Transactional(readOnly = true)
    public List<Funcionario> buscar(String nombre, String departamento) {
        if (tieneValor(nombre)) {
            return repositorio.findByNombreContainingIgnoreCaseOrderByIdAsc(nombre.trim());
        }
        if (tieneValor(departamento)) {
            return repositorio.findByDepartamentoIgnoreCaseOrderByIdAsc(departamento.trim());
        }
        return repositorio.findAll(Sort.by("id"));
    }

    @Transactional(readOnly = true)
    public Funcionario obtenerPorId(Long id) {
        return repositorio.findById(id)
                .orElseThrow(() -> new FuncionarioNoEncontradoException(id));
    }

    @Transactional
    public Funcionario registrar(Funcionario datos) {
        if (datos.getId() != null) {
            throw new SolicitudInvalidaException("No se debe enviar un ID al registrar un funcionario");
        }
        Funcionario nuevo = new Funcionario();
        copiarDatos(datos, nuevo);
        return repositorio.save(nuevo);
    }

    @Transactional
    public Funcionario actualizar(Long id, Funcionario datos) {
        Funcionario existente = obtenerPorId(id);
        copiarDatos(datos, existente);
        return repositorio.save(existente);
    }

    @Transactional
    public void eliminar(Long id) {
        Funcionario existente = obtenerPorId(id);
        repositorio.delete(existente);
    }

    /** Copia los campos editables, limpiando espacios sobrantes. El ID nunca se copia. */
    private void copiarDatos(Funcionario origen, Funcionario destino) {
        destino.setNombre(origen.getNombre().trim());
        destino.setCargo(origen.getCargo().trim());
        destino.setDepartamento(origen.getDepartamento().trim());
        destino.setTelefono(tieneValor(origen.getTelefono()) ? origen.getTelefono().trim() : null);
    }

    private boolean tieneValor(String texto) {
        return texto != null && !texto.isBlank();
    }
}
