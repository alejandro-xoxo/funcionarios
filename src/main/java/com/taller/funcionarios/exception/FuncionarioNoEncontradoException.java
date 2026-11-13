package com.taller.funcionarios.exception;

/** Se lanza cuando no existe un funcionario con el ID solicitado (HTTP 404). */
public class FuncionarioNoEncontradoException extends RuntimeException {

    public FuncionarioNoEncontradoException(Long id) {
        super("No existe un funcionario con ID " + id);
    }
}
