export class Etudiant {
  constructor(
    public matricule: string,
    public name: string,
    public promotion: string,
    public faculte: string,
    public groupe: number,
    public etatPresence?: string,
    public option?: string,
  ) {}
}
