type PageProps = { params: Promise<{ id: string }> };
export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <div><h1>Messages</h1><p>Project: {id}</p></div>;
}
