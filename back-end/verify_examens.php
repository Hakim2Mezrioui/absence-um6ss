<?php

/**
 * Script de vérification des examens avec group_id et ville_id
 * 
 * Usage: php verify_examens.php
 */

require_once 'vendor/autoload.php';

use App\Models\Examen;
use App\Models\Group;
use App\Models\Ville;

echo "🔍 Vérification des examens avec group_id et ville_id...\n\n";

try {
    // Compter les examens
    $totalExamens = Examen::count();
    echo "📊 Total des examens : $totalExamens\n";
    
    // Compter les examens avec group_id et ville_id
    $examensComplets = Examen::whereNotNull('group_id')->whereNotNull('ville_id')->count();
    echo "✅ Examens avec group_id et ville_id : $examensComplets\n";
    
    // Compter les examens sans group_id ou ville_id
    $examensIncomplets = Examen::whereNull('group_id')->orWhereNull('ville_id')->count();
    echo "⚠️  Examens incomplets : $examensIncomplets\n";
    
    if ($examensIncomplets > 0) {
        echo "\n❌ Il y a des examens incomplets !\n";
    } else {
        echo "\n🎉 Tous les examens ont group_id et ville_id !\n";
    }
    
    // Vérifier les relations
    echo "\n🔗 Vérification des relations...\n";
    
    $group = Group::first();
    $ville = Ville::first();
    
    if ($group) {
        echo "✅ Premier groupe trouvé : {$group->name} (ID: {$group->id})\n";
    } else {
        echo "❌ Aucun groupe trouvé\n";
    }
    
    if ($ville) {
        echo "✅ Première ville trouvée : {$ville->name} (ID: {$ville->id})\n";
    } else {
        echo "❌ Aucune ville trouvée\n";
    }
    
    // Vérifier un examen spécifique
    $examen = Examen::with(['group', 'ville'])->first();
    if ($examen) {
        echo "\n📝 Exemple d'examen :\n";
        echo "  - Titre : {$examen->title}\n";
        echo "  - Groupe : " . ($examen->group ? $examen->group->name : 'N/A') . "\n";
        echo "  - Ville : " . ($examen->ville ? $examen->ville->name : 'N/A') . "\n";
        echo "  - group_id : {$examen->group_id}\n";
        echo "  - ville_id : {$examen->ville_id}\n";
    }
    
} catch (Exception $e) {
    echo "❌ Erreur : " . $e->getMessage() . "\n";
}

echo "\n✨ Vérification terminée !\n";
