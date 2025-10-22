import Image from 'next/image';

export function AppLogo() {
  return (
    <div className="flex justify-center">
      {/* 
        Este componente agora carrega a imagem do seu logo.
        Certifique-se de que sua imagem está em 'public/logo.png'.
        Você pode ajustar 'width' e 'height' para o tamanho desejado.
      */}
      <Image
        src="/logo.png" // Caminho para a sua imagem na pasta 'public'
        alt="Logo da Empresa"
        width={200} // Largura da imagem em pixels
        height={100} // Altura da imagem em pixels
        priority // Ajuda a carregar a imagem principal mais rápido
      />
    </div>
  );
}
