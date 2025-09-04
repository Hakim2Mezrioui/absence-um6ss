<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Post extends Model
{
    protected $fillable = ['name'];

    /**
     * Get the users that belong to this post.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
