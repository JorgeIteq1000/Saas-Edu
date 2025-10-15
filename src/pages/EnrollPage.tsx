// src/pages/EnrollPage.tsx

import NewEnrollmentModal from '@/components/enrollments/NewEnrollmentModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function EnrollPage() {
  // A função de callback pode ser usada no futuro para, por exemplo,
  // redirecionar para a página de matrículas após o sucesso.
  const handleEnrollmentCreated = () => {
    console.log('log: Nova matrícula criada com sucesso a partir da página /matricular');
    // Exemplo: navigate('/enrollments');
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
            {/* Nós vamos reutilizar o mesmo modal que já existe, 
                passando um botão personalizado como gatilho. */}
            <NewEnrollmentModal
              onEnrollmentCreated={handleEnrollmentCreated}
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