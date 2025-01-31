export class Examen {
  constructor(
    public title: string,
    public date: Date,
    public hour_debut: Date,
    public hour_fin: Date,
    public hour_debut_pointage: Date,
    public faculte: string,
    public promotion: string,
    public statut: string,
    public id?: number,
  ) {}
}
