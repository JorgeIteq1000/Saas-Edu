// src/pages/EnrollPage.tsx

import NewSaleModal from '@/components/enrollments/NewSaleModal'; // Importe o novo modal
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EnrollPage() {
  const navigate = useNavigate();

  // Esta função será chamada após a matrícula ser criada com sucesso
  const handleSaleCreated = () => {
    console.log('log: Nova matrícula criada com sucesso. Redirecionando...');
    // Redireciona para a página de matrículas para ver o resultado
    navigate('/enrollments');
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Central de Matrículas</h1>
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Card className="max-w-2xl w-full text-center shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Registrar Nova Venda</CardTitle>
            <CardDescription className="pt-2">
              Clique no botão abaixo para abrir o formulário e cadastrar um novo aluno em um de nossos cursos ou pacotes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-8">
            <NewSaleModal
              onSaleCreated={handleSaleCreated}
              triggerButton={
                <Button size="lg" className="h-12 text-lg">
                  <PlusCircle className="mr-2 h-6 w-6" />
                  Matricular Novo Aluno
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}