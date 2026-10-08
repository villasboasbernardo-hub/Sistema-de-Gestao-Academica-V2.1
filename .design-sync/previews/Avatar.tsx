import { Avatar, AvatarImagem, AvatarRecuo } from "ciaara-11-ds";

/*
 * Retrato ilustrado e fictício (não é foto de ninguém): cabeça, cabelo e farda azul-marinho num
 * fundo azul-claro da rampa institucional. Embutido como data URI para a prévia funcionar sem rede.
 */
const RETRATO =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" fill="#d6e4f2"/>' +
      '<path d="M6 64c0-13 11-21 26-21s26 8 26 21z" fill="#003366"/>' +
      '<path d="M25 43l7 9 7-9z" fill="#ffffff"/>' +
      '<rect x="28" y="35" width="8" height="9" rx="2" fill="#c98f6b"/>' +
      '<ellipse cx="32" cy="27" rx="11" ry="12.5" fill="#e3ad8e"/>' +
      '<path d="M20.5 27c-1-10 4.5-15.5 11.5-15.5S44.5 17 43.5 27c-2.5-5.5-6.5-8-11.5-8s-9 2.5-11.5 8z" fill="#3b2a20"/>' +
      "</svg>",
  );

function Identificacao({ nome, perfil }: { readonly nome: string; readonly perfil: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-texto text-sm font-semibold">{nome}</span>
      <span className="text-texto-suave text-xs">{perfil}</span>
    </div>
  );
}

export function Iniciais() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarRecuo>MD</AvatarRecuo>
        </Avatar>
        <Identificacao nome="Marina Duarte" perfil="Encarregado da Administração Acadêmica" />
      </div>
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarRecuo>HC</AvatarRecuo>
        </Avatar>
        <Identificacao nome="Helena de Castro" perfil="Ajudante da Administração Acadêmica" />
      </div>
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarRecuo>R</AvatarRecuo>
        </Avatar>
        <Identificacao nome="Rafael" perfil="Operador" />
      </div>
    </div>
  );
}

export function ComFoto() {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-12">
        <AvatarImagem src={RETRATO} alt="" />
        <AvatarRecuo>MD</AvatarRecuo>
      </Avatar>
      <Identificacao nome="Marina Duarte" perfil="Encarregado da Administração Acadêmica" />
    </div>
  );
}

export function Tamanhos() {
  return (
    <div className="flex items-end gap-6">
      <div className="flex flex-col items-center gap-2">
        <Avatar className="size-8">
          <AvatarRecuo className="text-xs">MD</AvatarRecuo>
        </Avatar>
        <span className="text-texto-suave text-xs">Lista de contas</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar className="size-12">
          <AvatarRecuo>MD</AvatarRecuo>
        </Avatar>
        <span className="text-texto-suave text-xs">Página da conta</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar className="size-16">
          <AvatarRecuo className="text-lg">MD</AvatarRecuo>
        </Avatar>
        <span className="text-texto-suave text-xs">Meu perfil</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar className="size-16">
          <AvatarImagem src={RETRATO} alt="" />
          <AvatarRecuo className="text-lg">MD</AvatarRecuo>
        </Avatar>
        <span className="text-texto-suave text-xs">Meu perfil, com foto</span>
      </div>
    </div>
  );
}
