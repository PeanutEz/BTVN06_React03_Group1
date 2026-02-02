import api from "./api";

let cachedUserResource: "/users" | "/user" | null = null;

const getErrorStatus = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;
  const maybeResponse = (error as { response?: { status?: number } }).response;
  return maybeResponse?.status;
};

export async function requestWithUserResource<T>(requester: (resource: "/users" | "/user") => Promise<T>): Promise<T> {
  if (cachedUserResource) {
    return requester(cachedUserResource);
  }

  try {
    const result = await requester("/users");
    cachedUserResource = "/users";
    return result;
  } catch (error) {
    if (getErrorStatus(error) === 404) {
      const result = await requester("/user");
      cachedUserResource = "/user";
      return result;
    }
    throw error;
  }
}
