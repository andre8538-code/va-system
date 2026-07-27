type PageProps = { searchParams: Promise<{ project?: string }> };

export default async function NewCasePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preProject = params.project;

  return (
    <div>
      <h1>New Case</h1>
      <p>Project: {preProject || 'None'}</p>
    </div>
  );
}
