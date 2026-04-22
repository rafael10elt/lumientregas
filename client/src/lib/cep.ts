export type CepLookupResult = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  fullAddress: string;
};

function formatCep(cep: string) {
  return cep.replace(/\D/g, "");
}

export async function lookupCep(cep: string): Promise<CepLookupResult> {
  const sanitized = formatCep(cep);

  if (sanitized.length !== 8) {
    throw new Error("Informe um CEP válido com 8 dígitos");
  }

  const response = await fetch(`https://viacep.com.br/ws/${sanitized}/json/`);
  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP");
  }

  const data = await response.json();
  if (data.erro) {
    throw new Error("CEP não encontrado");
  }

  const street = String(data.logradouro ?? "").trim();
  const neighborhood = String(data.bairro ?? "").trim();
  const city = String(data.localidade ?? "").trim();
  const state = String(data.uf ?? "").trim();

  const fullAddress = [street, neighborhood, city, state]
    .filter(Boolean)
    .join(" - ");

  return {
    cep: sanitized,
    street,
    neighborhood,
    city,
    state,
    fullAddress,
  };
}
