"use client";
import { useState } from "react";

export default function PasswordInput(props: { id: string; name?: string; placeholder?: string; autoComplete?: string; minLength?: number; required?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input className="ctl" type={show ? "text" : "password"} {...props} name={props.name ?? props.id} />
      <button type="button" onClick={() => setShow(s => !s)} aria-pressed={show}>{show ? "Elrejt" : "Mutat"}</button>
    </div>
  );
}
