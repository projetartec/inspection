import Image from 'next/image';

export function AppLogo() {
  return (
    <div className="flex justify-center">
      {/* 
        Este componente agora carrega a imagem do seu logo.
        Você pode ajustar 'width' e 'height' para o tamanho desejado.
      */}
      <Image
        src="https://i.imgur.com/4se4p12.png" // Caminho para a sua imagem na pasta 'public'
        alt="Logo da Empresa"
        width={200} // Largura da imagem em pixels
        height={100} // Altura da imagem em pixels
        priority // Ajuda a carregar a imagem principal mais rápido
      />
    </div>
  );
}
