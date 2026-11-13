package com.taller.funcionarios.exception;

/** Se lanza cuando la solicitud no cumple las reglas del directorio (HTTP 400). */
public class SolicitudInvalidaException extends RuntimeException {

    public SolicitudInvalidaException(String mensaje) {
        super(mensaje);
    }
}
