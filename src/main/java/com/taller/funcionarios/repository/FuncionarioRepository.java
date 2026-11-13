package com.taller.funcionarios.repository;

import com.taller.funcionarios.model.Funcionario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FuncionarioRepository extends JpaRepository<Funcionario, Long> {

    /** Coincidencia parcial por nombre, sin distinguir mayúsculas y minúsculas. */
    List<Funcionario> findByNombreContainingIgnoreCaseOrderByIdAsc(String nombre);

    /** Coincidencia exacta del nombre del departamento, sin distinguir mayúsculas y minúsculas. */
    List<Funcionario> findByDepartamentoIgnoreCaseOrderByIdAsc(String departamento);
}
