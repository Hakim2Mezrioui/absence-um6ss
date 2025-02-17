export class Cours {
  constructor(
    public title: string,
    public date: string | Date,
    public hour_debut: string | Date,
    public hour_fin: string | Date,
    public faculte: string,
    public promotion: string,
    public groupe: number,
    public option?: string,
    public id?: number
  ) {
    // Convertir `date` en objet `Date` si c'est une chaîne
    this.date = typeof this.date === 'string' ? new Date(this.date) : this.date;

    // Convertir `hour_debut` et `hour_fin` en objets `Date`
    this.hour_debut = this.convertTime(this.hour_debut);
    this.hour_fin = this.convertTime(this.hour_fin);
  }

  private convertTime(time: string | Date): Date {
    if (time instanceof Date) return time; // Si c'est déjà une date, ne rien faire

    const [hours, minutes, seconds] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds || 0, 0);
    return date;
  }
}
