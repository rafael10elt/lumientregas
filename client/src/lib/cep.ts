export type CepAddress = {
  postalCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
};

export async function lookupCep(postalCode: string): Promise<CepAddress | null> {
  const clean = postalCode.replace(/\D/g, "");
  if (clean.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.erro) return null;

  return {
    postalCode: clean,
    street: data.logradouro ?? "",
    neighborhood: data.bairro ?? "",
    city: data.localidade ?? "",
    state: data.uf ?? "",
    complement: data.complemento ?? "",
  };
}

export function formatCep(value: string) {
  const clean = value.replace(/\D/g, "").slice(0, 8);
  return clean.replace(/^(\d{5})(\d{0,3})$/, (_, a, b) => (b ? `${a}-${b}` : a));
}
