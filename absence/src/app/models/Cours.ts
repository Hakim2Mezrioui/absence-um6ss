export class Cours {
  constructor(
    public title: string,
    public date: Date,
    public hour_debut: Date,
    public hour_fin: Date,
    public faculte: string,
    public promotion: string,
    public groupe: number,
    public option?: string,
    public id?: number
  ) {}
}
